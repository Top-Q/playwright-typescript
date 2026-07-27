#!/usr/bin/env node
/**
 * audit-run — contract conformance for a completed /gen-test run directory.
 *
 * The pipeline's gates check the *repository*: does it compile, does it lint,
 * do any gaps remain. Nothing checks the *run record*. That matters because the
 * run directory is the only thing an agent hands to the next stage — a
 * build-report row with an empty Evidence cell is a guessed locator that passed
 * every gate, and a gaps.json entry with an empty `searched` array means the
 * catalog was never really consulted.
 *
 * This is the missing check, and it is deliberately a program rather than a
 * reviewer's opinion, for the same reason every other gate is: an agent
 * grading its own handoff is not evidence.
 *
 * Used by the `verify-pipeline` skill, and runnable on its own against any run:
 *
 *     npm run pipeline:audit -- --run tc-mem-001-02-2026-07-22
 *     npm run pipeline:audit -- --run <id> --json
 *
 * Two limits, stated up front because a green audit must not be read as more
 * than it is:
 *
 *   - The markdown artifacts are parsed by shape, not understood. "Evidence:
 *     the source" passes the non-empty check and is worthless. This catches
 *     omissions, not lies.
 *   - A run that never reached a stage has nothing to audit there, which is
 *     reported as `skip`, not as a pass. An aborted run can audit clean.
 *
 * Zero runtime dependencies beyond Node builtins.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { PipelineError, resolveRunDir } from './run-directory';

const HELP = `
Usage: audit-run [--run <run-id>] [options]

Checks a /gen-test run directory against the handoff contract in
.claude/skills/gen-test/references/contract.md.

Options:
  -h, --help          Show this help message
      --run <run-id>  Run to audit (default: the most recently created run)
      --out <dir>     Runs root (default: .pipeline/runs)
      --json          Emit machine-readable JSON instead of a text report
      --quiet         Print only failures

Exit codes:
  0  every applicable check passed (warnings allowed)
  1  at least one check failed, or the run could not be read
`;

function fail(message: string): never {
  console.error(`audit-run: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    run: { type: 'string' },
    out: { type: 'string', default: '.pipeline/runs' },
    json: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

type Status = 'pass' | 'fail' | 'warn' | 'skip';

interface Check {
  /** Stable id, so a report can refer to a finding across runs. */
  id: string;
  /** Which artifact or stage the check belongs to. */
  group: string;
  title: string;
  status: Status;
  detail: string;
}

const checks: Check[] = [];
function record(id: string, group: string, title: string, status: Status, detail = ''): void {
  checks.push({ id, group, title, status, detail });
}

const runsRoot = path.resolve(process.cwd(), values.out);
if (!fs.existsSync(runsRoot)) fail(`runs root not found: ${values.out}`);

let runId: string;
let runDir: string;
try {
  // Shared with every other pipeline script, so "latest" means the same run
  // whichever one you ask.
  ({ runId, runDir } = resolveRunDir(runsRoot, values.run));
} catch (error) {
  fail(error instanceof PipelineError ? error.message : String(error));
}

function read(name: string): string | undefined {
  const full = path.join(runDir, name);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : undefined;
}

/** A markdown table cell that is present but says nothing. */
const EMPTY_CELL = /^(|-+|n\/?a|none|tbd|\?+)$/i;
/** Evidence phrasings that name no artifact — the failure this pipeline exists to prevent. */
const NON_EVIDENCE = /^(inferred|assumed|obvious|standard|from the spec|as usual|guess)/i;

function tableRows(markdown: string): string[][] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length > 1 && !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
}

// ---------------------------------------------------------------- run.json

interface RunRecord {
  runId?: string;
  specRef?: string;
  module?: string;
  branch?: string;
  status?: string;
  testFile?: string;
  suggestedTestFile?: string;
}

let run: RunRecord = {};
const runJson = read('run.json');
if (!runJson) {
  record('run.json', 'run.json', 'run.json exists', 'fail', 'the run record is missing');
} else {
  try {
    run = JSON.parse(runJson) as RunRecord;
    const required = ['runId', 'specRef', 'module', 'branch'] as const;
    const missing = required.filter((key) => !run[key]);
    record(
      'run.fields',
      'run.json',
      'required fields present',
      missing.length === 0 ? 'pass' : 'fail',
      missing.length === 0 ? required.join(', ') : `missing: ${missing.join(', ')}`,
    );
  } catch (error) {
    record('run.parse', 'run.json', 'run.json parses', 'fail', String(error));
  }
}

const testFile = run.testFile ?? run.suggestedTestFile;
if (!testFile) {
  record('run.testFile', 'run.json', 'names a test file', 'fail', 'neither testFile nor suggestedTestFile');
} else {
  const exists = fs.existsSync(path.resolve(process.cwd(), testFile));
  record(
    'run.testFile',
    'run.json',
    'the named test file exists',
    exists ? 'pass' : 'fail',
    exists ? testFile : `${testFile} is recorded but not on disk`,
  );
  if (!run.testFile) {
    record(
      'run.testFile.writeback',
      'run.json',
      'test-creator wrote testFile back',
      'warn',
      'only suggestedTestFile is set; later stages are running off a suggestion',
    );
  }
}

// ------------------------------------------------------------------ spec.md

const spec = read('spec.md');
record(
  'spec.present',
  'spec.md',
  'spec.md exists and is non-trivial',
  spec === undefined ? 'fail' : spec.trim().length > 40 ? 'pass' : 'warn',
  spec === undefined ? 'missing' : `${spec.trim().length} chars`,
);

// ---------------------------------------------------------------- gaps.json

interface Gap {
  id?: string;
  step?: string;
  requirement?: string;
  observable?: string;
  likelyClass?: string;
  likelyFile?: string;
  searched?: string[];
  reason?: string;
}

let gaps: Gap[] | undefined;
const gapsRaw = read('gaps.json');
const legacyRaw = gapsRaw === undefined ? read('stubs.json') : undefined;

if (gapsRaw === undefined && legacyRaw !== undefined) {
  record(
    'gaps.legacy',
    'gaps.json',
    'worklist uses the current name',
    'warn',
    'found stubs.json — a pre-rename run; auditing it as gaps.json',
  );
}

const worklistRaw = gapsRaw ?? legacyRaw;
if (worklistRaw === undefined) {
  record('gaps.present', 'gaps.json', 'gaps.json exists', 'fail', 'test-creator wrote no worklist');
} else {
  try {
    const parsed: unknown = JSON.parse(worklistRaw);
    if (!Array.isArray(parsed)) throw new Error('not an array');
    gaps = parsed as Gap[];
    record('gaps.present', 'gaps.json', 'gaps.json parses as an array', 'pass', `${gaps.length} gap(s)`);
  } catch (error) {
    record('gaps.present', 'gaps.json', 'gaps.json parses as an array', 'fail', String(error));
  }
}

// A pre-rename run carries stubs.json, whose entries were method designs rather
// than requirements. Auditing them against the gap schema produces three
// failures that say nothing about the run, so the schema checks are skipped and
// the shape difference is reported once.
const legacyWorklist = gapsRaw === undefined && legacyRaw !== undefined;

if (gaps && legacyWorklist) {
  record(
    'gaps.schema',
    'gaps.json',
    'worklist entries match the gap schema',
    'skip',
    'legacy stubs.json: entries are method designs, not requirements — schema checks not applicable',
  );
} else if (gaps) {
  const ids = gaps.map((gap) => gap.id ?? '');
  const duplicates = ids.filter((id, index) => id !== '' && ids.indexOf(id) !== index);
  record(
    'gaps.ids',
    'gaps.json',
    'ids are present and unique',
    ids.every(Boolean) && duplicates.length === 0 ? 'pass' : 'fail',
    duplicates.length > 0 ? `duplicated: ${[...new Set(duplicates)].join(', ')}` : ids.join(', ') || 'none',
  );

  const incomplete = gaps.filter(
    (gap) => !gap.step || !gap.requirement || !gap.reason || !gap.likelyFile,
  );
  record(
    'gaps.fields',
    'gaps.json',
    'every gap carries step, requirement, reason, likelyFile',
    gaps.length === 0 ? 'skip' : incomplete.length === 0 ? 'pass' : 'fail',
    incomplete.length === 0 ? '' : `incomplete: ${incomplete.map((gap) => gap.id).join(', ')}`,
  );

  // `searched` is what proves the catalog was consulted rather than skipped, and
  // po-builder turns it into @aliases so the next run finds the method instead of
  // re-declaring the same gap. An empty array breaks both.
  const unsearched = gaps.filter((gap) => !Array.isArray(gap.searched) || gap.searched.length === 0);
  record(
    'gaps.searched',
    'gaps.json',
    'every gap names what was searched for',
    gaps.length === 0 ? 'skip' : unsearched.length === 0 ? 'pass' : 'fail',
    unsearched.length === 0 ? '' : `no searched[]: ${unsearched.map((gap) => gap.id).join(', ')}`,
  );
}

/** Gaps the cross-artifact checks can address by id. Empty for a legacy worklist. */
const identifiedGaps = legacyWorklist
  ? []
  : (gaps ?? []).filter((gap): gap is Gap & { id: string } => Boolean(gap.id));

// ------------------------------------------------------------------ plan.md

const plan = read('plan.md');
if (plan === undefined) {
  record('plan.present', 'plan.md', 'plan.md exists', 'fail', 'missing');
} else {
  const rows = tableRows(plan);
  record(
    'plan.rows',
    'plan.md',
    'plan.md contains a step table',
    rows.length > 0 ? 'pass' : 'fail',
    `${rows.length} table row(s)`,
  );

  if (identifiedGaps.length > 0) {
    const absent = identifiedGaps.filter((gap) => !plan.includes(gap.id));
    record(
      'plan.gapRows',
      'plan.md',
      'every gap in gaps.json appears in plan.md',
      absent.length === 0 ? 'pass' : 'fail',
      absent.length === 0 ? '' : `missing: ${absent.map((gap) => gap.id).join(', ')}`,
    );

    const thin = identifiedGaps.filter((gap) => {
      const row = rows.find((cells) => cells.some((cell) => cell.includes(gap.id)));
      return !row || row.slice(1).some((cell) => EMPTY_CELL.test(cell));
    });
    record(
      'plan.gapJustified',
      'plan.md',
      'each gap row states what was searched and why it was insufficient',
      thin.length === 0 ? 'pass' : 'warn',
      thin.length === 0 ? '' : `thin justification: ${thin.map((gap) => gap.id).join(', ')}`,
    );
  }
}

// ----------------------------------------------------------- build-report.md

const build = read('build-report.md');
if (!gaps || gaps.length === 0) {
  record(
    'build.present',
    'build-report.md',
    'build-report.md exists',
    build === undefined ? 'skip' : 'pass',
    build === undefined ? 'no gaps — po-builder was correctly skipped' : 'present',
  );
} else if (build === undefined) {
  record('build.present', 'build-report.md', 'build-report.md exists', 'fail', `${gaps.length} gap(s) but no report`);
} else if (identifiedGaps.length === 0) {
  record('build.present', 'build-report.md', 'build-report.md exists', 'pass', 'per-gap checks need ids');
} else {
  const rows = tableRows(build);
  const missingRow = identifiedGaps.filter((gap) => !build.includes(gap.id));
  record(
    'build.rowPerGap',
    'build-report.md',
    'one row per declared gap',
    missingRow.length === 0 ? 'pass' : 'fail',
    missingRow.length === 0
      ? `${identifiedGaps.length} gap(s)`
      : `unreported: ${missingRow.map((gap) => gap.id).join(', ')}`,
  );

  // The Evidence column is the whole point of the artifact: a row without it is
  // a locator nobody can trace back to a source file or a snapshot ref.
  const unevidenced: string[] = [];
  const weak: string[] = [];
  for (const gap of identifiedGaps) {
    const row = rows.find((cells) => cells.some((cell) => cell.includes(gap.id)));
    if (!row) continue;
    const evidence = row[row.length - 1] ?? '';
    if (EMPTY_CELL.test(evidence)) unevidenced.push(gap.id);
    else if (NON_EVIDENCE.test(evidence)) weak.push(gap.id);
  }
  record(
    'build.evidence',
    'build-report.md',
    'every row cites evidence',
    unevidenced.length === 0 ? 'pass' : 'fail',
    unevidenced.length === 0 ? '' : `empty Evidence cell: ${unevidenced.join(', ')}`,
  );
  if (weak.length > 0) {
    record(
      'build.evidenceQuality',
      'build-report.md',
      'evidence names an artifact, not a belief',
      'warn',
      `reads as assertion rather than citation: ${weak.join(', ')}`,
    );
  }
}

// ---------------------------------------------------------------- execution

const testRunDir = path.join(runDir, 'test-run');
let attempts: string[] = [];
if (fs.existsSync(testRunDir)) {
  attempts = fs
    .readdirSync(testRunDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => Number(a) - Number(b));
}

record(
  'run.executed',
  'test-run',
  'the test was executed at least once',
  attempts.length > 0 ? 'pass' : 'fail',
  attempts.length > 0 ? `${attempts.length} attempt(s)` : 'no test-run/<n> directory',
);

let finalExit: string | undefined;
for (const attempt of attempts) {
  const codePath = path.join(testRunDir, attempt, 'exit-code');
  const stdoutPath = path.join(testRunDir, attempt, 'stdout.txt');
  const hasBoth = fs.existsSync(codePath) && fs.existsSync(stdoutPath);
  if (!hasBoth) {
    record(
      `run.attempt.${attempt}`,
      'test-run',
      `attempt ${attempt} captured stdout and exit code`,
      'fail',
      'the healer reads both; one is missing',
    );
  }
  if (fs.existsSync(codePath)) finalExit = fs.readFileSync(codePath, 'utf8').trim();
}

if (finalExit !== undefined) {
  record(
    'run.finalExit',
    'test-run',
    'the last attempt passed',
    finalExit === '0' ? 'pass' : 'warn',
    finalExit === '0' ? 'exit 0' : `exit ${finalExit} — a run may honestly end red; check heal-report.md`,
  );
}

// -------------------------------------------------------------- heal-report

const heal = read('heal-report.md');
const healIterations = heal === undefined ? 0 : (heal.match(/^##\s+Iteration/gim) ?? []).length;
if (attempts.length <= 1) {
  record('heal.present', 'heal-report.md', 'heal-report.md exists', 'skip', 'the test passed first time');
} else if (heal === undefined) {
  record(
    'heal.present',
    'heal-report.md',
    'heal-report.md exists',
    'fail',
    `${attempts.length} attempts but no heal report`,
  );
} else {
  record(
    'heal.iterations',
    'heal-report.md',
    'one section per heal iteration',
    healIterations >= attempts.length - 1 ? 'pass' : 'warn',
    `${healIterations} section(s) for ${attempts.length - 1} re-run(s)`,
  );
}

// ------------------------------------------------------------------- review

record(
  'review.present',
  'review.md',
  'review.md exists',
  read('review.md') === undefined ? 'fail' : 'pass',
  read('review.md') === undefined ? 'stage 7 left no artifact' : '',
);
record(
  'summary.present',
  'summary.md',
  'summary.md exists',
  read('summary.md') === undefined ? 'warn' : 'pass',
  read('summary.md') === undefined ? 'npm run pipeline:report was not run' : '',
);

// ------------------------------------------------------------------- output

const failed = checks.filter((check) => check.status === 'fail');
const warned = checks.filter((check) => check.status === 'warn');

if (values.json) {
  console.log(
    JSON.stringify(
      {
        runId,
        module: run.module,
        specRef: run.specRef,
        testFile,
        gapCount: gaps?.length ?? null,
        attempts: attempts.length,
        healIterations,
        finalExit: finalExit ?? null,
        failed: failed.length,
        warned: warned.length,
        checks,
      },
      null,
      2,
    ),
  );
} else {
  console.log(`audit-run: ${runId}  (module ${run.module ?? '?'}, spec ${run.specRef ?? '?'})`);
  const symbol: Record<Status, string> = { pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'skip' };
  for (const check of checks) {
    if (values.quiet && check.status !== 'fail') continue;
    const detail = check.detail ? `  — ${check.detail}` : '';
    console.log(`  ${symbol[check.status].padEnd(4)}  ${check.id.padEnd(24)} ${check.title}${detail}`);
  }
  console.log(
    `\n${checks.length} check(s): ${checks.length - failed.length - warned.length} ok, ` +
      `${warned.length} warning(s), ${failed.length} failure(s)`,
  );
}

process.exit(failed.length > 0 ? 1 : 0);
