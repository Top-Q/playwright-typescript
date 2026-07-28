#!/usr/bin/env node
/**
 * stage — records a stage boundary in the run record.
 *
 * `run.json` has carried `status` and `stages` since the first version of the
 * contract, and nothing ever wrote either: run-init seeded `stages: []` and
 * `status: "initialised"`, and there they stayed for the rest of the run. A
 * field that is always the same value is not a record, so the only account of
 * what happened when was the orchestrator's own narration — which is exactly
 * the thing that does not survive a context window.
 *
 * The run's overall status is derived here rather than passed in, so the two
 * cannot contradict each other: a failed stage fails the run, `finalize`
 * completes it, anything else means still in flight.
 *
 * `pipeline:test-run` records its own attempts, so the stages worth recording by
 * hand are the agent stages and the gates between them.
 */

import { parseArgs } from 'node:util';
import * as path from 'path';
import { requireFlagsSurvived } from './cli-args';
import { PipelineError, StageEntry, appendStage, readRun, resolveRunDir } from './run-directory';

const HELP = `
Usage: stage --stage <name> --status <ok|fail|skip> [options]

Appends a stage entry to .pipeline/runs/<run-id>/run.json.

Options:
  -h, --help            Show this help message
      --stage <name>    Required unless --list. Stage name, e.g. test-creator, gate:2
      --status <s>      Required unless --list: ok | fail | skip
      --run <run-id>    Run to record against (default: the most recent)
      --out <dir>       Runs root (default: .pipeline/runs)
      --exit <n>        Exit code, for a gate or a test run
      --note <text>     One line of context — why it was skipped, what failed
      --list            Print the recorded timeline instead of appending
      --json            Emit the updated record as JSON

Exit codes:
  0  recorded
  1  the run could not be read, or the arguments were invalid

Examples:
  stage --stage test-creator --status ok --note "4 gaps, 7 steps"
  stage --stage gate:2 --status fail --exit 2 --note "ratio 0.71 — routing to 2.5"
  stage --list
`;

requireFlagsSurvived('pipeline:stage');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    stage: { type: 'string' },
    status: { type: 'string' },
    run: { type: 'string' },
    out: { type: 'string', default: '.pipeline/runs' },
    exit: { type: 'string' },
    note: { type: 'string' },
    list: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

function fail(message: string): never {
  console.error(`stage: ${message}`);
  process.exit(1);
}

const STATUSES = ['ok', 'fail', 'skip'] as const;

function isStatus(value: string): value is StageEntry['status'] {
  return (STATUSES as readonly string[]).includes(value);
}

try {
  const { runDir } = resolveRunDir(path.resolve(process.cwd(), values.out), values.run);

  if (values.list) {
    const record = readRun(runDir);
    const stages = record.stages ?? [];
    if (values.json) {
      console.log(JSON.stringify({ runId: record.runId, status: record.status, stages }, null, 2));
    } else if (stages.length === 0) {
      console.log(`stage: ${record.runId} — no stages recorded (status ${record.status})`);
    } else {
      console.log(`stage: ${record.runId} — ${record.status}`);
      for (const entry of stages) {
        const exit = entry.exitCode === undefined ? '' : ` exit ${entry.exitCode}`;
        console.log(
          `  ${entry.at.slice(11, 19)}  ${entry.status.padEnd(4)}  ` +
            `${entry.stage.padEnd(18)}${entry.note ?? ''}${exit}`,
        );
      }
    }
    process.exit(0);
  }

  if (!values.stage) fail('--stage is required (e.g. test-creator, gate:2, finalize)');
  if (!values.status) fail(`--status is required (${STATUSES.join(' | ')})`);
  if (!isStatus(values.status)) fail(`--status must be one of ${STATUSES.join(', ')}`);

  const exitCode = values.exit === undefined ? undefined : Number(values.exit);
  if (exitCode !== undefined && !Number.isInteger(exitCode)) {
    fail(`--exit must be an integer, got "${values.exit}"`);
  }

  const record = appendStage(runDir, {
    stage: values.stage,
    status: values.status,
    at: new Date().toISOString(),
    ...(exitCode === undefined ? {} : { exitCode }),
    ...(values.note === undefined ? {} : { note: values.note }),
  });

  if (values.json) {
    console.log(JSON.stringify(record, null, 2));
  } else {
    console.log(
      `stage: ${values.stage} ${values.status}` +
        `${exitCode === undefined ? '' : ` (exit ${exitCode})`} — run is now ${record.status}`,
    );
  }
} catch (error) {
  if (error instanceof PipelineError) fail(error.message);
  throw error;
}
