#!/usr/bin/env node
/**
 * test-run — stage 5 of the /gen-test pipeline: execute the run's test and
 * record the attempt.
 *
 * The skill wrote this as
 *
 *     PLAYWRIGHT_HTML_OPEN=never npx playwright test <testFile> --reporter=list
 *
 * which is a POSIX env-var prefix, and a parse error in PowerShell — the shell
 * this project actually runs on. Without the variable a passing run opens a
 * browser window and blocks the pipeline, so getting it wrong is not cosmetic.
 *
 * Three more things were being done by hand around it, once per heal iteration:
 * resolving `testFile` (with its fallback to `suggestedTestFile`), picking the
 * next `test-run/<n>` number, and writing `stdout.txt` and `exit-code` where the
 * healer and the report expect them. None of that is a judgement call.
 *
 * Exits with the test's own exit code, so the heal loop can branch on it.
 */

import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  PipelineError,
  appendStage,
  readRun,
  resolveRunDir,
  resolveTestFile,
  toPosix,
} from './run-directory';

const HELP = `
Usage: test-run [--run <run-id>] [options] [-- <extra playwright args>]

Runs the test a /gen-test run is about, into .pipeline/runs/<run-id>/test-run/<n>/.

Options:
  -h, --help          Show this help message
      --run <run-id>  Run to execute (default: the most recently created run)
      --out <dir>     Runs root (default: .pipeline/runs)
      --file <path>   Test file to run (default: run.json testFile, else suggestedTestFile)
      --attempt <n>   Attempt number (default: one past the highest recorded)
      --json          Emit machine-readable JSON instead of the test output
      --quiet         Do not echo the test output

Exit codes:
  the test's own exit code — 0 when it passed, non-zero when it failed
  1 if the run or the test file could not be resolved

Examples:
  test-run
  test-run --run tc-mem-001-02-2026-07-22-09-46-16
  test-run -- --grep @members
`;

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    run: { type: 'string' },
    out: { type: 'string', default: '.pipeline/runs' },
    file: { type: 'string' },
    attempt: { type: 'string' },
    json: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

function fail(message: string): never {
  console.error(`test-run: ${message}`);
  process.exit(1);
}

const repoRoot = process.cwd();

/** One past the highest numbered attempt directory; 1 on a fresh run. */
function nextAttempt(testRunDir: string): number {
  if (!fs.existsSync(testRunDir)) return 1;
  const numbers = fs
    .readdirSync(testRunDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => Number(entry.name));
  return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
}

try {
  const { runId, runDir } = resolveRunDir(path.resolve(repoRoot, values.out), values.run);
  const record = readRun(runDir);
  const testFile = values.file ?? resolveTestFile(record);

  if (!fs.existsSync(path.resolve(repoRoot, testFile))) {
    // Playwright's own message for this ("no tests found") reads like an empty
    // file rather than a missing one, and the usual cause is test-creator
    // writing its file somewhere other than suggestedTestFile without recording
    // it — `npm run pipeline:set -- --test-file <path>` is the fix.
    fail(
      `test file not found: ${testFile}\n` +
        `  run.json says ${record.testFile ? 'testFile' : 'suggestedTestFile'}; ` +
        'if the creator wrote it elsewhere, record the real path with pipeline:set',
    );
  }

  const testRunDir = path.join(runDir, 'test-run');
  const attempt = values.attempt === undefined ? nextAttempt(testRunDir) : Number(values.attempt);
  if (!Number.isInteger(attempt) || attempt < 1) {
    fail(`--attempt must be a positive integer, got "${values.attempt}"`);
  }
  const attemptDir = path.join(testRunDir, String(attempt));
  fs.mkdirSync(attemptDir, { recursive: true });

  // Playwright's own CLI entry point, run on this Node directly. `npx` would
  // mean spawning npx.cmd on Windows, which Node refuses without `shell: true`,
  // which in turn would put every argument through shell quoting rules.
  const cli = ['node_modules/@playwright/test/cli.js', 'node_modules/playwright/cli.js']
    .map((candidate) => path.resolve(repoRoot, candidate))
    .find((candidate) => fs.existsSync(candidate));
  if (cli === undefined) fail('Playwright is not installed — run `npm install`');

  const args = [cli, 'test', testFile, '--reporter=list', ...positionals];
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      // Without this a *passing* run opens the HTML report and blocks forever.
      PLAYWRIGHT_HTML_OPEN: 'never',
    },
    // Playwright's list reporter is chatty; 10 MB is well clear of a full run.
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const exitCode = result.error ? 1 : (result.status ?? 1);
  const output = result.error
    ? `${result.error.message}\n${stdout}${stderr}`
    : stderr.trim().length > 0
      ? `${stdout}\n--- stderr ---\n${stderr}`
      : stdout;

  fs.writeFileSync(path.join(attemptDir, 'stdout.txt'), output, 'utf8');
  fs.writeFileSync(path.join(attemptDir, 'exit-code'), `${exitCode}\n`, 'utf8');

  appendStage(runDir, {
    stage: 'execute',
    status: exitCode === 0 ? 'ok' : 'fail',
    at: new Date().toISOString(),
    exitCode,
    note: `attempt ${attempt}: ${testFile}`,
  });

  const attemptDirRelative = toPosix(path.relative(repoRoot, attemptDir));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (values.json) {
    console.log(
      JSON.stringify(
        { runId, testFile, attempt, exitCode, passed: exitCode === 0, artifacts: attemptDirRelative },
        null,
        2,
      ),
    );
  } else {
    if (!values.quiet) process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
    console.log(
      `\ntest-run: attempt ${attempt} — ${exitCode === 0 ? 'PASSED' : 'FAILED'}` +
        ` (exit ${exitCode}, ${seconds}s)`,
    );
    console.log(`  ${attemptDirRelative}/stdout.txt`);
    if (exitCode !== 0) {
      console.log('  trace: test-results/ — read it with the playwright-trace skill');
    }
  }

  process.exit(exitCode);
} catch (error) {
  if (error instanceof PipelineError) fail(error.message);
  throw error;
}
