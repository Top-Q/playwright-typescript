#!/usr/bin/env node
/**
 * cleanup — releases the browser resources a /gen-test run holds.
 *
 * Every browser-using stage ends with the same two instructions: close the
 * playwright-cli sessions, and stop any background `playwright test` you
 * started. They are repeated in the skill and in three agent definitions, which
 * is how the instruction gets followed three times out of four — and a leaked
 * run holds a browser and a port, so the next stage dies with
 * `browser.bind: Server is already started` and the failure looks like the new
 * stage's fault.
 *
 * Detection lives in `leaked-runs.ts`, and is deliberately not keyed to the
 * `--debug=cli` flag: that matched one recipe for starting a run rather than a
 * run, and missed every leak that came from any other.
 *
 * Sessions are closed by default: that is what `playwright-cli close-all` is
 * for, and it affects nothing but the tool's own browsers. **Processes are only
 * reported**, and killed solely under `--kill`, because pattern-matching a
 * command line and terminating whatever it hits is not something a script
 * should do on its own initiative.
 */

import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { requireFlagsSurvived } from './cli-args';
import { describeRun, findLeakedTestRuns } from './leaked-runs';

const HELP = `
Usage: cleanup [options]

Closes playwright-cli sessions and reports leaked playwright test runs
belonging to this checkout.

Options:
  -h, --help       Show this help message
      --kill       Also terminate the leaked test runs found
      --dry-run    Report what is open; close nothing
      --json       Emit machine-readable JSON

Exit codes:
  0  nothing left holding a browser, or --dry-run
  1  something is still held: sessions could not be closed, or processes remain
     and --kill was not passed

Examples:
  cleanup
  cleanup --kill
  cleanup --dry-run --json
`;

requireFlagsSurvived('pipeline:cleanup');

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    kill: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

interface Result {
  sessions: string;
  closed: boolean | null;
  processes: number[];
  killed: number[];
  notes: string[];
}

const result: Result = { sessions: '', closed: null, processes: [], killed: [], notes: [] };

/** shell:true so Windows resolves whatever shim playwright-cli installed. */
function shell(command: string): { code: number; out: string } {
  const spawned = spawnSync(command, {
    encoding: 'utf8',
    shell: true,
    windowsHide: true,
  });
  return {
    code: spawned.error ? 127 : (spawned.status ?? 1),
    out: `${spawned.stdout ?? ''}${spawned.stderr ?? ''}`.trim(),
  };
}

// ------------------------------------------------------- playwright-cli

const listed = shell('playwright-cli list');
if (listed.code === 127) {
  result.notes.push('playwright-cli is not on PATH — no sessions to close');
} else {
  result.sessions = listed.out;
  if (!values['dry-run']) {
    const closed = shell('playwright-cli close-all');
    result.closed = closed.code === 0;
    if (closed.code !== 0) result.notes.push(`close-all failed: ${closed.out.split(/\r?\n/)[0]}`);
  }
}

// ------------------------------------------------- leaked test processes

const repoRoot = process.cwd();
const leaked = findLeakedTestRuns(repoRoot);
if (!leaked.enumerated) {
  result.notes.push('could not enumerate processes; check for a stray playwright test run by hand');
}
result.processes = leaked.runs.map((run) => run.pid);
for (const run of leaked.runs) {
  result.notes.push(`leaked ${run.root ? 'run ' : 'child '}${describeRun(run)}`);
}

// Only the roots are terminated: `/T` takes each tree with it, so killing a
// descendant as well would just report a failure for a process that is already
// gone.
const roots = leaked.runs.filter((run) => run.root).map((run) => run.pid);

if (roots.length > 0 && values.kill && !values['dry-run']) {
  for (const pid of roots) {
    try {
      if (process.platform === 'win32') {
        // /T because the test process owns browser children; killing only the
        // parent leaves them holding the port that made this a problem.
        const killed = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
          encoding: 'utf8',
          windowsHide: true,
        });
        if ((killed.status ?? 1) === 0) result.killed.push(pid);
        else result.notes.push(`taskkill ${pid}: ${(killed.stderr ?? '').trim()}`);
      } else {
        process.kill(pid, 'SIGTERM');
        result.killed.push(pid);
      }
    } catch (error) {
      result.notes.push(`could not kill ${pid}: ${error instanceof Error ? error.message : ''}`);
    }
  }
}

// What survived is a fact to be read back, not inferred from what was killed:
// terminating a root takes its whole tree, so subtracting the killed pids from
// the matched ones would report descendants as remaining after they had died.
const remaining =
  values.kill && !values['dry-run'] && result.killed.length > 0
    ? findLeakedTestRuns(repoRoot).runs.map((run) => run.pid)
    : result.processes.filter((pid) => !result.killed.includes(pid));
const clean = result.closed !== false && (remaining.length === 0 || values['dry-run']);

if (values.json) {
  console.log(JSON.stringify({ ...result, remaining, clean }, null, 2));
} else {
  if (result.sessions) {
    console.log(`cleanup: sessions before close-all:\n  ${result.sessions.replace(/\n/g, '\n  ')}`);
  }
  if (result.closed === true) console.log('cleanup: playwright-cli close-all — done');
  if (values['dry-run']) console.log('cleanup: --dry-run, nothing was closed');
  if (result.killed.length > 0) console.log(`cleanup: killed ${result.killed.join(', ')}`);
  if (remaining.length > 0) {
    const runs = roots.length > 0 ? roots.length : remaining.length;
    console.error(
      `cleanup: ${runs} leaked test run(s) still going, ` +
        `${remaining.length} process(es): ${remaining.join(', ')}` +
        (values.kill ? '' : '\n  pass --kill to terminate them, or stop them yourself'),
    );
  }
  for (const note of result.notes) console.log(`  note: ${note}`);
  if (clean && remaining.length === 0) console.log('cleanup: nothing left holding a browser');
}

process.exit(clean ? 0 : 1);
