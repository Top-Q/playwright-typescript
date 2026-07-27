/**
 * run-directory — the run record, and the handful of operations every pipeline
 * script performs on it.
 *
 * Subagents hand off through files, so `.pipeline/runs/<run-id>/run.json` is the
 * one structure the whole pipeline agrees on. It was previously described only
 * in contract.md and re-derived in each script — "which run is the latest",
 * "testFile or suggestedTestFile", "how a run id is built" were three separate
 * opinions per file. They live here instead, so that a change to the record is a
 * change in one place rather than a hunt.
 *
 * Zero runtime dependencies beyond Node builtins.
 */

import * as fs from 'fs';
import * as path from 'path';

/** Thrown for an expected, explainable failure; CLIs print it and exit 1. */
export class PipelineError extends Error {}

/**
 * One stage boundary, as observed by the orchestrator. `stages` existed in the
 * contract from the start but nothing ever wrote it — `pipeline:stage` does now,
 * which is what turns run.json into a timeline instead of a static header.
 */
export interface StageEntry {
  /** Stage name as the skill numbers it: `preflight`, `test-creator`, `gate:2`… */
  stage: string;
  status: 'ok' | 'fail' | 'skip';
  /** ISO timestamp. */
  at: string;
  /** Exit code, when the stage was a gate or a test run. */
  exitCode?: number;
  note?: string;
}

/** `.pipeline/runs/<run-id>/run.json`, written by run-init and updated in place. */
export interface RunRecord {
  runId: string;
  specRef: string;
  specKind: 'requirement' | 'test-case' | 'markdown';
  sourceFile: string;
  specPath: string;
  module: string;
  suggestedTestFile: string;
  /** Set by test-creator via `pipeline:set` when it deviates from the suggestion. */
  testFile?: string;
  testCaseIds: string[];
  branch: string | null;
  createdAt: string;
  status: 'initialised' | 'in-progress' | 'complete' | 'failed';
  stages: StageEntry[];
}

/** Repo-relative paths are forward-slashed everywhere, including on Windows. */
export function toPosix(value: string): string {
  return value.split(path.sep).join('/');
}

export function relativeToRepo(repoRoot: string, target: string): string {
  return toPosix(path.relative(repoRoot, target));
}

export function kebab(text: string): string {
  return (
    text
      .toLowerCase()
      // Parentheticals are cross-references ("(BR-MEM-01)"), not part of the name.
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      // Truncation can leave a trailing separator or a half word; drop both.
      .replace(/-+[a-z0-9]{0,2}$/, '')
      .replace(/-+$/, '')
  );
}

/**
 * The run id, which is also the branch suffix. Preflight needs it *before*
 * run-init writes anything, because the branch has to exist first and be
 * recorded in the record — deriving it in two places is how the id and the
 * branch drifted apart.
 */
export function makeRunId(specRef: string, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
  return `${kebab(specRef)}-${stamp}`;
}

/** Most recently created run, by directory mtime. */
export function latestRunId(runsRoot: string): string {
  if (!fs.existsSync(runsRoot)) throw new PipelineError(`no runs directory at ${toPosix(runsRoot)}`);
  const candidates = fs
    .readdirSync(runsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      mtime: fs.statSync(path.join(runsRoot, entry.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) throw new PipelineError(`no runs found under ${toPosix(runsRoot)}`);
  return candidates[0].name;
}

/**
 * Resolves `--run` to a directory. Absent — or the literal `latest`, which is
 * what a caller writes when the id is not known until the run exists — means the
 * most recent run.
 */
export function resolveRunDir(runsRoot: string, runId?: string): { runId: string; runDir: string } {
  const resolved = runId === undefined || runId === 'latest' ? latestRunId(runsRoot) : runId;
  const runDir = path.join(runsRoot, resolved);
  if (!fs.existsSync(runDir)) throw new PipelineError(`run not found: ${resolved}`);
  return { runId: resolved, runDir };
}

export function readRun(runDir: string): RunRecord {
  const file = path.join(runDir, 'run.json');
  if (!fs.existsSync(file)) throw new PipelineError(`run.json missing in ${toPosix(runDir)}`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as RunRecord;
  } catch (error) {
    throw new PipelineError(`run.json is unreadable: ${String(error)}`);
  }
}

export function writeRun(runDir: string, record: RunRecord): void {
  fs.writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

/**
 * Appends a stage entry and derives the run's overall status from it, so the
 * orchestrator records one fact rather than two that could disagree. A failed
 * stage marks the run failed; `finalize` closes it; anything else is in flight.
 */
export function appendStage(runDir: string, entry: StageEntry): RunRecord {
  const record = readRun(runDir);
  record.stages = [...(record.stages ?? []), entry];
  record.status =
    entry.status === 'fail'
      ? 'failed'
      : entry.stage === 'finalize' && entry.status === 'ok'
        ? 'complete'
        : 'in-progress';
  writeRun(runDir, record);
  return record;
}

/**
 * The test the run is about. `suggestedTestFile` is run-init's guess; `testFile`
 * is what test-creator actually wrote. Every stage after 1 must prefer the
 * latter, and every stage after 1 used to re-implement this fallback.
 */
export function resolveTestFile(record: RunRecord): string {
  const file = record.testFile ?? record.suggestedTestFile;
  if (!file) throw new PipelineError(`run ${record.runId} names no test file`);
  return file;
}

/**
 * True when this process was started to run `<name>.ts` itself, rather than
 * importing it. Scripts that are both a CLI and a library — run-init is one,
 * since preflight calls it — guard their argument parsing with this. Matching on
 * argv rather than `import.meta` keeps it correct whichever module format tsx
 * picks for a given file.
 */
export function isMain(name: string): boolean {
  const entry = process.argv[1];
  return entry !== undefined && path.basename(entry) === name;
}
