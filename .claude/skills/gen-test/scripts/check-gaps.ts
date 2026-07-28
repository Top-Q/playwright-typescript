#!/usr/bin/env node
/**
 * check-gaps — the gap gate for the /gen-test pipeline.
 *
 * test-creator writes the whole test but implements only the steps the POM
 * catalog can already express. Every step it cannot express becomes a *gap*:
 * the step body is a single throw carrying an id and a plain-English
 * requirement.
 *
 *     await test.step('When the user changes the role to Reader', async () => {
 *         throw new Error('GAP-3: change this member row role to a given value');
 *     });
 *
 * po-builder then designs the API, implements it, and replaces the throw with
 * real calls. A gap therefore carries no method name, signature or return type
 * — that is the point. The agent with no browser does not get to invent an API
 * for infrastructure it has never seen; it states the requirement and stops.
 *
 * Two numbers are checked here and they answer different questions:
 *
 *   count  how many gaps remain. Expected to be `n` after stage 1 and 0 after
 *          stage 3. This is completeness.
 *   ratio  gaps as a fraction of the test's steps. A high ratio means the
 *          creator had almost no existing infrastructure to design against, so
 *          the "test" is a restatement of the spec. That is not the creator
 *          failing — it is the module needing investigation before generating
 *          against it is worth attempting, which is why it gets its own exit
 *          code rather than being lumped in with a count mismatch.
 *
 * Gaps are legal in two places: a test file (the normal case) and a page-object
 * method (po-builder admitting it could not implement something). One marker
 * form, so one scan finds both.
 *
 * `--run <id>` reads the scope out of the run record instead of taking it on the
 * command line: the test file from run.json, the expected count from the length
 * of gaps.json. That removes a transcription step, and it makes a third check
 * possible — that the gap **ids** in the test are the ids the creator declared.
 * The contract has always said the gate compares the two; until run mode existed
 * it compared only the counts, so four ids matching four entries by number and
 * not by name passed clean.
 *
 * Zero runtime dependencies beyond Node builtins.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { requireFlagsSurvived } from './cli-args';
import { PipelineError, readRun, resolveRunDir, resolveTestFile } from './run-directory';

/** The gate's threshold for "this test is mostly deferred", in one place. */
const DEFAULT_RATIO_MAX = 0.6;

const HELP = `
Usage: check-gaps [options]

Reports unimplemented steps ("gaps") left by the test-generation pipeline.

Options:
  -h, --help            Show this help message
      --root <dirs>     Comma-separated dirs to scan (default: tests,src/po)
      --file <path>     Scan only this file; required by --ratio-max
      --expect <n>      Required gap count; exits 1 on any other count (default: 0).
                        With --expect 0 the declared ids are expected to be gone,
                        so only "undeclared" and "duplicated" are checked
      --ratio-max <r>   Exit 2 if gaps/steps exceeds r (needs --file)
      --run <run-id>    Take the file, the expected count and the declared ids
                        from a run directory ("latest" for the newest run)
      --out <dir>       Runs root, with --run (default: .pipeline/runs)
      --json            Emit machine-readable JSON instead of a text report
      --quiet           Suppress the success line

Exit codes:
  0  the count matched --expect and the ratio was within --ratio-max
  1  the count did not match, the ids disagreed, or the scan could not run
  2  the count matched but the ratio exceeded --ratio-max

Examples:
  check-gaps                                              # gate: no gaps may remain
  check-gaps --file tests/ui/members/invite.spec.ts --expect 4 --ratio-max 0.6
  check-gaps --run latest                                 # stage 2, from the run record
  check-gaps --json
`;

function fail(message: string): never {
  console.error(`check-gaps: ${message}`);
  process.exit(1);
}

requireFlagsSurvived('gate:gaps');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    root: { type: 'string', default: 'tests,src/po' },
    file: { type: 'string' },
    expect: { type: 'string' },
    'ratio-max': { type: 'string' },
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

const repoRoot = process.cwd();

/** One entry of the run's gaps.json; only the id matters to the gate. */
interface DeclaredGap {
  id?: string;
}

/** Scope taken from the command line, or from the run record under `--run`. */
let scopeFile = values.file;
let declaredIds: string[] | undefined;
/**
 * Whether every id in gaps.json must still appear in the source. True at stage
 * 2, where the worklist describes what the test defers; false whenever zero
 * gaps are expected, where their absence is the whole point.
 */
let declaredMustAppear = true;
let expected = values.expect === undefined ? 0 : Number(values.expect);
let ratioMax = values['ratio-max'] === undefined ? undefined : Number(values['ratio-max']);

if (values.run !== undefined) {
  try {
    const runsRoot = path.resolve(repoRoot, values.out);
    const { runDir } = resolveRunDir(runsRoot, values.run);
    const record = readRun(runDir);
    scopeFile ??= resolveTestFile(record);

    const gapsFile = path.join(runDir, 'gaps.json');
    if (!fs.existsSync(gapsFile)) {
      fail(`gaps.json missing in ${record.runId} — test-creator did not finish its stage`);
    }
    let declared: DeclaredGap[];
    try {
      declared = JSON.parse(fs.readFileSync(gapsFile, 'utf8')) as DeclaredGap[];
    } catch (error) {
      fail(`gaps.json in ${record.runId} is not valid JSON: ${String(error)}`);
    }
    if (!Array.isArray(declared)) fail(`gaps.json in ${record.runId} is not an array`);

    declaredIds = declared.map((gap, index) => gap.id ?? `(entry ${index + 1} has no id)`);
    // An explicit --expect still wins: it is how stage 4 asks for zero against a
    // gaps.json that legitimately still lists what stage 1 deferred.
    if (values.expect === undefined) expected = declared.length;
    // …and asking for zero is asking for those ids to be *gone*, so the
    // "declared but never written" arm cannot also apply there. It used to,
    // which made `--run latest --expect 0` — the documented stage-4 gate —
    // unpassable by construction: a po-builder that implemented every gap
    // scored one `missing` per gap and exited 1. The other two arms still mean
    // what they always meant, so they stay on.
    declaredMustAppear = expected > 0;
    ratioMax ??= DEFAULT_RATIO_MAX;
  } catch (error) {
    if (error instanceof PipelineError) fail(error.message);
    throw error;
  }
}

if (!Number.isInteger(expected) || expected < 0) {
  fail(`--expect must be a non-negative integer, got "${values.expect}"`);
}
if (ratioMax !== undefined && !(ratioMax >= 0)) {
  fail(`--ratio-max must be a non-negative number, got "${values['ratio-max']}"`);
}
if (ratioMax !== undefined && scopeFile === undefined) {
  fail('--ratio-max needs --file: a ratio is only meaningful within one test file');
}

/** An unimplemented step found in a test file or a page-object method. */
interface GapHit {
  /** Repo-relative, forward-slashed path. */
  file: string;
  /** 1-indexed line number. */
  line: number;
  /** The id from `GAP-<id>`, as the creator wrote it in gaps.json. */
  id: string;
  /** The plain-English requirement following the colon. */
  requirement: string;
  /** Enclosing `test.step()` description, when there is one. */
  step?: string;
}

/** The one legal gap marker: `throw new Error('GAP-3: do the thing')`. */
const GAP_MARKER = /throw new Error\(\s*['"`]GAP-(?<id>[\w.-]+)\s*:\s*(?<requirement>[^'"`]*)/;
/** Counts the test's steps, which is the denominator of the ratio. */
const STEP_CALL = /\btest\.step\s*\(/g;
/** Pulls the description out of the `test.step()` a gap sits inside. */
const STEP_DESCRIPTION = /\btest\.step\s*\(\s*['"`](?<description>[^'"`]*)/;

function listTypeScriptFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      found.push(...listTypeScriptFiles(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      found.push(full);
    }
  }
  return found;
}

/**
 * Looks back from a gap for the `test.step()` it sits in, so the report names
 * the Gherkin sentence rather than only a line number. Ten lines is enough for
 * a step whose body is a throw, and short enough that a gap in a page-object
 * method does not adopt an unrelated step from further up the file.
 */
function findStepBefore(lines: string[], markerIndex: number): string | undefined {
  for (let i = markerIndex; i >= Math.max(0, markerIndex - 10); i--) {
    const description = STEP_DESCRIPTION.exec(lines[i])?.groups?.description;
    if (description) return description;
  }
  return undefined;
}

function scanTargets(): string[] {
  if (scopeFile !== undefined) {
    const absolute = path.resolve(repoRoot, scopeFile);
    if (!fs.existsSync(absolute)) fail(`file not found: ${scopeFile}`);
    return [absolute];
  }
  const roots = values.root
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const files: string[] = [];
  for (const root of roots) {
    const absolute = path.resolve(repoRoot, root);
    // A missing root is not an error: a fresh checkout may have no tests yet,
    // and "nothing to scan" is honestly zero gaps.
    if (fs.existsSync(absolute)) files.push(...listTypeScriptFiles(absolute));
  }
  return files;
}

const hits: GapHit[] = [];
let steps = 0;

for (const absolute of scanTargets()) {
  const file = path.relative(repoRoot, absolute).split(path.sep).join('/');
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    steps += line.match(STEP_CALL)?.length ?? 0;
    const marker = GAP_MARKER.exec(line);
    if (marker) {
      hits.push({
        file,
        line: index + 1,
        id: `GAP-${marker.groups?.id ?? '?'}`,
        requirement: (marker.groups?.requirement ?? '').trim(),
        step: findStepBefore(lines, index),
      });
    }
  });
}

const count = hits.length;
const countMatched = count === expected;
// Zero steps means the file is not a test — report the ratio as 0 rather than
// dividing by zero and routing the run to investigation over a parse quirk.
const ratio = steps === 0 ? 0 : count / steps;
const ratioExceeded = ratioMax !== undefined && ratio > ratioMax;

/**
 * The ids in the source against the ids in gaps.json. Counting alone cannot see
 * a gap renumbered, duplicated, or declared and never written — all of which
 * leave po-builder working from a worklist that does not describe the test.
 */
interface IdComparison {
  missing: string[];
  undeclared: string[];
  duplicated: string[];
}

const idComparison: IdComparison | undefined =
  declaredIds === undefined
    ? undefined
    : {
        missing: declaredMustAppear
          ? declaredIds.filter((id) => !hits.some((hit) => hit.id === id))
          : [],
        undeclared: hits.map((hit) => hit.id).filter((id) => !declaredIds.includes(id)),
        duplicated: [
          ...new Set(
            hits
              .map((hit) => hit.id)
              .filter((id, index, all) => all.indexOf(id) !== index),
          ),
        ],
      };
const idsMatched =
  idComparison === undefined ||
  (idComparison.missing.length === 0 &&
    idComparison.undeclared.length === 0 &&
    idComparison.duplicated.length === 0);

if (values.json) {
  console.log(
    JSON.stringify(
      { expected, count, steps, ratio, ratioMax, declaredIds, ids: idComparison, gaps: hits },
      null,
      2,
    ),
  );
} else if (count > 0) {
  // Matching the expected count is a pass, so the listing goes to stdout and is
  // phrased neutrally; only a mismatch is an error.
  const write = countMatched ? console.log : console.error;
  write(
    countMatched
      ? `check-gaps: ${count} gap(s) pending implementation:`
      : `check-gaps: ${count} gap(s) found, expected ${expected}:`,
  );
  for (const hit of hits) {
    write(`  - ${hit.file}:${hit.line}  ${hit.id}  ${hit.requirement}`);
    if (hit.step) write(`      step: ${hit.step}`);
  }
}

if (!countMatched) {
  if (!values.json) {
    console.error(
      count > expected
        ? `\nExpected ${expected}, found ${count}. Unfilled gaps must be implemented by po-builder.`
        : `\nExpected ${expected}, found ${count}. Declared gaps are missing from the source.`,
    );
  }
  process.exit(1);
}

if (!idsMatched && idComparison !== undefined) {
  if (!values.json) {
    console.error(`check-gaps: the gap ids in ${scopeFile ?? 'the source'} do not match gaps.json:`);
    if (idComparison.missing.length > 0) {
      console.error(`  declared but never written: ${idComparison.missing.join(', ')}`);
    }
    if (idComparison.undeclared.length > 0) {
      console.error(`  written but never declared:  ${idComparison.undeclared.join(', ')}`);
    }
    if (idComparison.duplicated.length > 0) {
      console.error(`  written more than once:      ${idComparison.duplicated.join(', ')}`);
    }
    console.error(
      '\nThe worklist and the test disagree. po-builder works from gaps.json, so a gap' +
        '\nthat is only in one of them is either implemented against nothing or left throwing.',
    );
  }
  process.exit(1);
}

if (ratioExceeded) {
  if (!values.json) {
    console.error(
      `\ncheck-gaps: ${count}/${steps} steps are gaps (${ratio.toFixed(2)} > ${ratioMax}).` +
        `\nThe catalog covered too little of this spec for the test to be a design rather than` +
        `\na restatement of it. Investigate the module and regenerate the catalog before` +
        `\ngenerating against it.`,
    );
  }
  process.exit(2);
}

if (!values.quiet && !values.json) {
  const scope = scopeFile ?? values.root;
  if (expected === 0) {
    console.log(`check-gaps: clean — no gaps in ${scope}`);
  } else if (scopeFile === undefined) {
    // Without --file the step count spans every scanned file, so a ratio drawn
    // from it would not describe any one test.
    console.log(`check-gaps: ${count} gap(s), as expected`);
  } else {
    console.log(
      `check-gaps: ${count} gap(s) across ${steps} step(s)` +
        ` (ratio ${ratio.toFixed(2)}), as expected`,
    );
  }
  if (idComparison !== undefined) {
    const declaredCount = declaredIds?.length ?? 0;
    console.log(
      declaredMustAppear
        ? `  ids agree with gaps.json (${declaredCount} declared)`
        : `  all ${declaredCount} declared gap(s) implemented; no undeclared or duplicate markers`,
    );
  }
}
