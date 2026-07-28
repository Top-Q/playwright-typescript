#!/usr/bin/env node
/**
 * run-report — collapses a /gen-test run directory into one summary.md.
 *
 * Each stage drops its own artifact and none of them can see the others, so
 * this is the only place the whole run is visible at once. It reports what is
 * present and what is missing rather than failing on gaps: an aborted run still
 * produces a useful summary, and "po-builder never wrote a build report" is
 * itself the finding.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { requireFlagsSurvived } from './cli-args';
import { PipelineError, resolveRunDir } from './run-directory';

const HELP = `
Usage: run-report [--run <run-id>] [options]

Aggregates a run directory into summary.md.

Options:
  -h, --help          Show this help message
      --run <run-id>  Run to summarise (default: the most recently created run)
      --out <dir>     Runs root (default: .pipeline/runs)
      --stdout        Write the summary to stdout instead of summary.md

Examples:
  run-report
  run-report --run fr-mem-001-2026-07-22-09-46-16
  run-report --stdout
`;

function fail(message: string): never {
  console.error(`run-report: ${message}`);
  process.exit(1);
}

requireFlagsSurvived('pipeline:report');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    run: { type: 'string' },
    out: { type: 'string', default: '.pipeline/runs' },
    stdout: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

const repoRoot = process.cwd();
const runsRoot = path.resolve(repoRoot, values.out);
if (!fs.existsSync(runsRoot)) fail(`no runs directory at ${values.out}`);

let runId: string;
let runDir: string;
try {
  // Shared with every other pipeline script, so "latest" means the same run
  // whichever one you ask.
  ({ runId, runDir } = resolveRunDir(runsRoot, values.run));
} catch (error) {
  fail(error instanceof PipelineError ? error.message : String(error));
}

/**
 * A step test-creator could not build from the catalog. It carries the
 * requirement but no API — po-builder decides the method name and signature.
 */
interface GapEntry {
  id?: string;
  step?: string;
  requirement?: string;
  likelyClass?: string;
  reason?: string;
}

/** One stage boundary, recorded by `pipeline:stage` or `pipeline:test-run`. */
interface StageEntry {
  stage?: string;
  status?: string;
  at?: string;
  exitCode?: number;
  note?: string;
}

/** The subset of run.json this report renders; written by run-init. */
interface RunRecord {
  runId: string;
  specRef: string;
  specKind: string;
  sourceFile: string;
  module: string;
  branch: string | null;
  createdAt: string;
  status?: string;
  stages?: StageEntry[];
}

function readJson<T>(name: string): T | undefined {
  const file = path.join(runDir, name);
  if (!fs.existsSync(file)) return undefined;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

function readText(name: string): string | undefined {
  const file = path.join(runDir, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : undefined;
}

/**
 * Nests an artifact's markdown under a `##` section of the summary: drops its
 * own top-level title and pushes the rest down so the summary keeps one
 * coherent heading hierarchy instead of restarting at `#` partway through.
 */
function nestHeadings(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line, index) => !(index === 0 && /^#\s/.test(line)))
    .map((line) => (/^#{1,4}\s/.test(line) ? `##${line}` : line))
    .join('\n')
    .trim();
}

const run = readJson<RunRecord>('run.json');
if (!run) fail(`run.json missing or unreadable in ${runId}`);

const gaps = readJson<GapEntry[]>('gaps.json') ?? [];

/** Test-run attempts are numbered directories; the highest number is the latest. */
function testAttempts(): { attempt: number; exitCode: string; tail: string }[] {
  const testRunDir = path.join(runDir, 'test-run');
  if (!fs.existsSync(testRunDir)) return [];
  return fs
    .readdirSync(testRunDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d+$/.test(entry.name))
    .map((entry) => {
      const dir = path.join(testRunDir, entry.name);
      const exitFile = path.join(dir, 'exit-code');
      const outFile = path.join(dir, 'stdout.txt');
      const stdout = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8').trimEnd() : '';
      const lines = stdout.split(/\r?\n/).filter(Boolean);
      return {
        attempt: Number(entry.name),
        exitCode: fs.existsSync(exitFile)
          ? fs.readFileSync(exitFile, 'utf8').trim()
          : '(not recorded)',
        tail: lines.slice(-3).join('\n'),
      };
    })
    .sort((a, b) => a.attempt - b.attempt);
}

const attempts = testAttempts();
const last = attempts.at(-1);
const passed = last?.exitCode === '0';

const sections: string[] = [];

sections.push(`# Run summary — ${runId}`);
sections.push('');
sections.push(
  [
    `- **Spec:** \`${run.specRef}\` (${run.specKind}) from \`${run.sourceFile}\``,
    `- **Module:** \`${run.module}\``,
    `- **Branch:** ${run.branch ? `\`${run.branch}\`` : '_not recorded_'}`,
    `- **Created:** ${run.createdAt}`,
    `- **Status:** ${run.status ?? 'unrecorded'}`,
    `- **Outcome:** ${last === undefined ? '⚠️ test never executed' : passed ? '✅ passing' : '❌ failing'}`,
  ].join('\n'),
);
sections.push('');

const stages = run.stages ?? [];
if (stages.length > 0) {
  // The one account of what happened when. Without it the summary can say which
  // artifacts exist but not the order they arrived in, or which gate turned the
  // run around — the orchestrator's narration does not outlive its context.
  sections.push('## Timeline');
  sections.push('');
  sections.push('| When | Stage | Status | Detail |');
  sections.push('|---|---|---|---|');
  for (const entry of stages) {
    const when = (entry.at ?? '').slice(11, 19) || '—';
    const exit = entry.exitCode === undefined ? '' : ` (exit ${entry.exitCode})`;
    const detail = `${entry.note ?? ''}${exit}`.replace(/\|/g, '\\|').trim();
    sections.push(`| ${when} | ${entry.stage ?? '?'} | ${entry.status ?? '?'} | ${detail} |`);
  }
  sections.push('');
}

sections.push('## Stage artifacts');
sections.push('');
sections.push('| Stage | Artifact | Status |');
sections.push('|---|---|---|');
const artifacts: [string, string][] = [
  ['run-init', 'spec.md'],
  ['test-creator', 'plan.md'],
  ['test-creator', 'gaps.json'],
  ['po-builder', 'build-report.md'],
  ['test-healer', 'heal-report.md'],
  ['test-reviewer', 'review.md'],
];
for (const [stage, artifact] of artifacts) {
  const present = fs.existsSync(path.join(runDir, artifact));
  sections.push(`| ${stage} | \`${artifact}\` | ${present ? 'present' : '— missing'} |`);
}
sections.push('');

sections.push('## Infrastructure written');
sections.push('');
if (gaps.length === 0) {
  sections.push(
    fs.existsSync(path.join(runDir, 'gaps.json'))
      ? 'No gaps — the test was built entirely from existing page objects.'
      : '_`gaps.json` was never written; the test-creator stage did not complete._',
  );
} else {
  sections.push(`${gaps.length} gap(s) declared by test-creator:`);
  sections.push('');
  sections.push('| Gap | Step | Likely owner | Why the catalog did not cover it |');
  sections.push('|---|---|---|---|');
  for (const gap of gaps) {
    const owner = gap.likelyClass ? `\`${gap.likelyClass}\`` : '_undecided_';
    sections.push(
      `| ${gap.id ?? '?'} | ${gap.step ?? gap.requirement ?? ''} | ${owner} | ${gap.reason ?? ''} |`,
    );
  }
  sections.push('');
  sections.push('The API for each was chosen by po-builder — see the build report.');
}
sections.push('');

sections.push('## Test execution');
sections.push('');
if (attempts.length === 0) {
  sections.push('_The test was never executed._');
} else {
  sections.push('| Attempt | Exit code | Last output |');
  sections.push('|---|---|---|');
  for (const attempt of attempts) {
    const tail = attempt.tail.replace(/\|/g, '\\|').replace(/\n/g, ' · ');
    sections.push(`| ${attempt.attempt} | ${attempt.exitCode} | ${tail} |`);
  }
  if (attempts.length > 1) {
    sections.push('');
    sections.push(`Healed across ${attempts.length - 1} iteration(s).`);
  }
}
sections.push('');

for (const [heading, artifact] of [
  ['Build report', 'build-report.md'],
  ['Heal report', 'heal-report.md'],
  ['Review', 'review.md'],
] as const) {
  const body = readText(artifact);
  if (body) {
    sections.push(`## ${heading}`);
    sections.push('');
    sections.push(nestHeadings(body));
    sections.push('');
  }
}

const summary = `${sections.join('\n').trimEnd()}\n`;

if (values.stdout) {
  process.stdout.write(summary);
} else {
  const summaryPath = path.join(runDir, 'summary.md');
  fs.writeFileSync(summaryPath, summary, 'utf8');
  console.log(
    `run-report: ${path.relative(repoRoot, summaryPath).split(path.sep).join('/')}` +
      ` (${last === undefined ? 'not executed' : passed ? 'passing' : 'failing'})`,
  );
}
