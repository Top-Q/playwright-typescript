#!/usr/bin/env node
/**
 * preflight — stage 0 of the /gen-test pipeline, as one command.
 *
 * The baseline has to be green before anything is generated: a failure after
 * generating on a broken baseline cannot be attributed to the new code, which
 * wastes the whole run. That was six shell commands the orchestrator retyped
 * every time, and two of them were wrong:
 *
 *   - `curl -sf -o /dev/null` has no meaning on Windows, where /dev/null is just
 *     a path; the check left a stray file behind and proved nothing.
 *   - the branch was created *before* run-init, but run-init is what generates
 *     the run id, so `test-gen/<run-id>` could not be known yet. The branch and
 *     the id drifted apart as a matter of course.
 *
 * Here the id is derived first, from the same helper run-init uses, and then
 * everything downstream — record, branch, run directory — is built from it.
 *
 * Diagnostics run before mutations: every environment check is reported, and
 * only if all of them pass is a branch created or a run directory written. A
 * red preflight leaves the repository exactly as it found it.
 */

import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
import { requireFlagsSurvived } from './cli-args';
import { PipelineError, RunRecord, makeRunId } from './run-directory';
import { initRun } from './run-init';
import { describeRun, findLeakedTestRuns } from './leaked-runs';

const HELP = `
Usage: preflight --spec <ref> [options]

Runs the /gen-test stage 0 checks and opens the run directory.

Options:
  -h, --help            Show this help message
      --spec <ref>      Required. FR id, TC id, or path to a markdown spec
      --app-url <url>   UI base URL to probe (default: http://localhost:8090)
      --graph <dir>     Requirements graph directory (default: requirements/graph)
      --out <dir>       Runs root (default: .pipeline/runs)
      --branch <name>   Branch name to create (default: test-gen/<run-id>)
      --no-branch       Do not create a branch
      --skip-gates      Skip gate:catalog/types/lint/gaps (debugging only)
      --json            Emit machine-readable JSON

Exit codes:
  0  every check passed; the run directory is ready
  1  a check failed — nothing was created

Examples:
  preflight --spec TC-MEM-001-02
  preflight --spec FR-MEM-001 --json
`;

requireFlagsSurvived('pipeline:preflight');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    spec: { type: 'string' },
    'app-url': { type: 'string', default: 'http://localhost:8090' },
    graph: { type: 'string', default: 'requirements/graph' },
    out: { type: 'string', default: '.pipeline/runs' },
    branch: { type: 'string' },
    'no-branch': { type: 'boolean', default: false },
    'skip-gates': { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}
if (!values.spec) {
  console.error('preflight: --spec is required (an FR id, a TC id, or a markdown path)');
  process.exit(1);
}
const specRef = values.spec;

type Status = 'ok' | 'fail' | 'warn' | 'skip';

interface Check {
  name: string;
  status: Status;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, status: Status, detail = ''): Check {
  const check = { name, status, detail };
  checks.push(check);
  return check;
}

/** Captured, not inherited: a check's output belongs in its own detail line. */
function run(command: string, args: string[], useShell = false): { code: number; out: string } {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: useShell,
    windowsHide: true,
  });
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  if (result.error) return { code: 127, out: result.error.message };
  return { code: result.status ?? 1, out };
}

/**
 * The part of a failed command's output worth reading. Lines naming an error
 * come first: eslint prints its errors above a wall of warnings, so a plain tail
 * shows the warnings and hides the one line that actually failed the gate.
 */
function tail(text: string, lines = 6): string {
  const all = text.split(/\r?\n/).filter(Boolean);
  const errors = all.filter((line) => /\berror\b/i.test(line));
  const chosen = errors.length > 0 ? errors.slice(0, lines) : all.slice(-lines);
  return chosen.map((line) => line.trim()).join('\n    ');
}

const repoRoot = process.cwd();

// ------------------------------------------------------------------ git

let baseBranch = '';
{
  const head = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (head.code !== 0) {
    record('git', 'fail', 'not a git repository — the run has nowhere to isolate itself');
  } else {
    baseBranch = head.out.trim();
    if (baseBranch.startsWith('test-gen/')) {
      // Branching a run off another run's branch buries this run's diff under
      // the previous one's, and the reviewer diffs against the base branch.
      record('git', 'warn', `HEAD is \`${baseBranch}\`, itself a run branch`);
    } else {
      record('git', 'ok', `base branch \`${baseBranch}\``);
    }
  }
}

// ---------------------------------------------------------------- gates

if (values['skip-gates']) {
  record('gates', 'skip', '--skip-gates was passed; the baseline is unverified');
} else {
  // Driven through npm so package.json stays the single definition of a gate.
  const gates: [string, string][] = [
    ['gate:catalog', 'POM catalog matches src/po'],
    ['gate:types', 'tsc --noEmit'],
    ['gate:lint', 'eslint .'],
    ['gate:gaps', 'no GAP- markers remain'],
  ];
  for (const [script, description] of gates) {
    const result = run('npm', ['run', '--silent', script], true);
    if (result.code === 0) {
      record(script, 'ok', description);
    } else if (script === 'gate:gaps') {
      // Leftover gaps are not a broken baseline — they are a previous run that
      // aborted mid-flight, and reverting them is the user's call, not ours.
      record(script, 'fail', `gaps left by an earlier run:\n    ${tail(result.out)}`);
    } else {
      record(script, 'fail', `${description} failed:\n    ${tail(result.out)}`);
    }
  }
}

// ------------------------------------------------------------------ app

async function probeApp(url: string): Promise<Check> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
    // Any HTTP answer proves the server is up. A 302 to /login is the normal
    // response here, and demanding 200 would fail an entirely healthy instance.
    return record('app', 'ok', `${url} responded ${response.status}`);
  } catch (error) {
    return record(
      'app',
      'fail',
      `${url} unreachable (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

// -------------------------------------------------------- playwright-cli

function probePlaywrightCli(): void {
  // shell:true so Windows resolves the shim through PATHEXT, whatever it is.
  const result = run('playwright-cli --version', [], true);
  if (result.code === 0) record('playwright-cli', 'ok', result.out.split(/\r?\n/)[0] ?? '');
  else record('playwright-cli', 'fail', 'not on PATH — the browser stages cannot investigate');
}

// ----------------------------------------------------------------- module

/**
 * Where the spec's module actually landed in the repository.
 *
 * A `module` naming no existing directory is not automatically wrong — that is
 * precisely the `bare` case stage 2.5 exists for — so this warns rather than
 * fails. What it prevents is the silent version: a *covered* module resolving to
 * a directory that does not exist, which reaches test-creator as an empty
 * catalog, gaps out every step, and spends an investigation pass rebuilding page
 * objects that were there all along.
 */
function probeModule(runRecord: RunRecord): void {
  const poDir = path.join(repoRoot, 'src/po/openproject', runRecord.module);
  const catalog = path.join(repoRoot, 'pom-catalog/openproject', `${runRecord.module}.json`);
  const testDir = runRecord.testDirectory ?? runRecord.module;

  if (fs.existsSync(poDir) && fs.existsSync(catalog)) {
    record('module', 'ok', `${runRecord.module} — page objects and catalog present`);
  } else if (fs.existsSync(poDir)) {
    record('module', 'warn', `${runRecord.module} has page objects but no ${runRecord.module}.json`);
  } else {
    record(
      'module',
      'warn',
      `no src/po/openproject/${runRecord.module} — a new module (stage 2.5 will map it), ` +
        'or the module mapping in run-init.ts needs an entry',
    );
  }
  record('tests', 'ok', `tests/ui/${testDir}`);
}

// ------------------------------------------------------------ leaked runs

/**
 * Playwright runs left alive by an earlier session.
 *
 * Reported here as well as at cleanup because a leak inherited from a previous
 * session holds a browser and a port before this run starts, and the end of this
 * run cannot undo that. It warns rather than fails: the run may well succeed,
 * and terminating somebody else's process is `cleanup --kill`'s decision to
 * offer, not preflight's to make.
 */
function probeLeakedRuns(): void {
  const leaked = findLeakedTestRuns(repoRoot);
  if (!leaked.enumerated) {
    record('leaks', 'warn', 'could not enumerate processes');
  } else if (leaked.runs.length === 0) {
    record('leaks', 'ok', 'no playwright test runs left over');
  } else {
    record(
      'leaks',
      'warn',
      `${leaked.runs.length} leaked test run(s) from an earlier session — ` +
        'run `npm run pipeline:cleanup -- --kill`:\n    ' +
        leaked.runs.map(describeRun).join('\n    '),
    );
  }
}

// ----------------------------------------------------------------- main

async function main(): Promise<number> {
  await probeApp(values['app-url']);
  probePlaywrightCli();
  probeLeakedRuns();

  const blocked = checks.some((check) => check.status === 'fail');

  let runId = makeRunId(specRef, new Date());
  let branch = values.branch ?? `test-gen/${runId}`;
  let runDir = '';
  let runRecord: RunRecord | undefined;

  if (!blocked) {
    // Mutations start here, spec first: resolving it can still fail, and it is
    // better to fail with no branch created than to leave one behind.
    try {
      const initialised = initRun({
        specRef,
        repoRoot,
        graph: values.graph,
        out: values.out,
        runId,
        branch: values['no-branch'] ? null : branch,
      });
      runRecord = initialised.record;
      runId = initialised.record.runId;
      runDir = initialised.runDir;
      record('run', 'ok', runDir);
      probeModule(initialised.record);
    } catch (error) {
      record('run', 'fail', error instanceof PipelineError ? error.message : String(error));
    }

    if (runRecord === undefined) {
      // no run directory, so nothing to branch for
    } else if (values['no-branch']) {
      branch = '';
      record('branch', 'skip', '--no-branch was passed; the run shares the current branch');
    } else if (run('git', ['rev-parse', '--verify', '--quiet', branch]).code === 0) {
      record('branch', 'fail', `${branch} already exists`);
    } else {
      const created = run('git', ['checkout', '-b', branch]);
      if (created.code === 0) record('branch', 'ok', `${branch} created from \`${baseBranch}\``);
      else record('branch', 'fail', `git checkout -b ${branch}: ${tail(created.out, 2)}`);
    }
  }

  const failed = checks.filter((check) => check.status === 'fail');
  const ok = failed.length === 0;

  if (values.json) {
    console.log(
      JSON.stringify(
        {
          ok,
          runId: runRecord ? runId : null,
          runDir: runDir || null,
          module: runRecord?.module ?? null,
          suggestedTestFile: runRecord?.suggestedTestFile ?? null,
          branch: branch || null,
          baseBranch,
          checks,
        },
        null,
        2,
      ),
    );
    return ok ? 0 : 1;
  }

  const marker: Record<Status, string> = {
    ok: '  ok  ',
    fail: 'FAIL  ',
    warn: 'warn  ',
    skip: 'skip  ',
  };
  console.log(ok ? `preflight: ready — ${runId}` : 'preflight: BLOCKED');
  for (const check of checks) {
    console.log(`  ${marker[check.status]}${check.name.padEnd(16)}${check.detail}`);
  }
  if (ok && runRecord) {
    console.log('');
    console.log(`  run dir     ${runDir}`);
    console.log(`  module      ${runRecord.module}`);
    console.log(`  suggested   ${runRecord.suggestedTestFile}`);
    console.log(`  spec        ${path.posix.normalize(runRecord.specPath)}`);
  } else if (!ok) {
    console.log('');
    console.log('Nothing was created. Fix the failures above and run preflight again.');
  }
  return ok ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(`preflight: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
