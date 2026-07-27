#!/usr/bin/env node
/**
 * set-field — updates one field of the run record.
 *
 * There is exactly one field an agent is expected to write back: `testFile`,
 * when test-creator puts the test somewhere other than `suggestedTestFile`.
 * Every stage after it runs that value, and until now the instruction was to
 * hand-edit run.json — an agent editing the file that the rest of the pipeline
 * reads, with no schema and no validation. A botched edit does not fail loudly;
 * it fails three stages later as a missing test file.
 *
 * So: a narrow allowlist of fields, each validated, and JSON written by a
 * program. `--test-file` must exist on disk, which also catches the more common
 * error — recording a path the creator meant to write and did not.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { PipelineError, RunRecord, readRun, resolveRunDir, toPosix, writeRun } from './run-directory';

const HELP = `
Usage: set-field [--run <run-id>] <field> [options]

Updates a field of .pipeline/runs/<run-id>/run.json.

Fields:
      --test-file <path>  The test this run is about; must exist on disk
      --module <name>     Override the module the run maps onto
      --branch <name>     Record the branch the run lives on
      --status <s>        initialised | in-progress | complete | failed

Options:
  -h, --help              Show this help message
      --run <run-id>      Run to update (default: the most recent)
      --out <dir>         Runs root (default: .pipeline/runs)
      --json              Emit the updated record as JSON

Exit codes:
  0  updated
  1  the run could not be read, or the value was rejected

Examples:
  set-field --test-file tests/ui/members/invite-a-new-user.spec.ts
  set-field --run fr-mem-001-2026-07-22-09-46-16 --status failed
`;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    run: { type: 'string' },
    out: { type: 'string', default: '.pipeline/runs' },
    'test-file': { type: 'string' },
    module: { type: 'string' },
    branch: { type: 'string' },
    status: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

function fail(message: string): never {
  console.error(`set-field: ${message}`);
  process.exit(1);
}

const STATUSES: RunRecord['status'][] = ['initialised', 'in-progress', 'complete', 'failed'];

const repoRoot = process.cwd();

try {
  const { runDir } = resolveRunDir(path.resolve(repoRoot, values.out), values.run);
  const record = readRun(runDir);
  const changed: string[] = [];

  if (values['test-file'] !== undefined) {
    const relative = toPosix(path.relative(repoRoot, path.resolve(repoRoot, values['test-file'])));
    if (!fs.existsSync(path.resolve(repoRoot, relative))) {
      fail(`test file does not exist: ${relative} — write the test before recording its path`);
    }
    record.testFile = relative;
    changed.push(`testFile = ${relative}`);
  }

  if (values.module !== undefined) {
    record.module = values.module;
    changed.push(`module = ${values.module}`);
  }

  if (values.branch !== undefined) {
    record.branch = values.branch;
    changed.push(`branch = ${values.branch}`);
  }

  if (values.status !== undefined) {
    if (!STATUSES.includes(values.status as RunRecord['status'])) {
      fail(`--status must be one of ${STATUSES.join(', ')}`);
    }
    record.status = values.status as RunRecord['status'];
    changed.push(`status = ${values.status}`);
  }

  if (changed.length === 0) fail('nothing to set — pass one of --test-file, --module, --branch, --status');

  writeRun(runDir, record);

  if (values.json) console.log(JSON.stringify(record, null, 2));
  else console.log(`set-field: ${record.runId} — ${changed.join(', ')}`);
} catch (error) {
  if (error instanceof PipelineError) fail(error.message);
  throw error;
}
