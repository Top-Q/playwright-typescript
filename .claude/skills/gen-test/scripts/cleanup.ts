#!/usr/bin/env node
/**
 * cleanup — releases the browser resources a /gen-test run holds.
 *
 * Every browser-using stage ends with the same two instructions: close the
 * playwright-cli sessions, and stop any background `playwright test --debug=cli`
 * you started. They are repeated in the skill and in three agent definitions,
 * which is how the instruction gets followed three times out of four — and a
 * leaked debug session holds a browser and a port, so the next stage dies with
 * `browser.bind: Server is already started` and the failure looks like the new
 * stage's fault.
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

const HELP = `
Usage: cleanup [options]

Closes playwright-cli sessions and reports leaked --debug=cli test processes.

Options:
  -h, --help       Show this help message
      --kill       Also terminate the leaked --debug=cli processes found
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

// ------------------------------------------------- leaked debug processes

/**
 * Test runs started as `playwright test … --debug=cli` and never stopped.
 *
 * The flag alone is not a safe marker: any shell that *typed* the command still
 * carries the string on its own command line, and so does the query process
 * itself — searching for it naively reports the searcher. What is wanted is a
 * node process running Playwright, so both conditions are required.
 */
function findDebugProcesses(): number[] {
  const MARKER = '--debug=cli';
  if (process.platform === 'win32') {
    const query = shell(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process ' +
        "-Filter \\\"Name = 'node.exe'\\\" | " +
        `Where-Object { $_.CommandLine -like '*${MARKER}*' ` +
        "-and $_.CommandLine -like '*playwright*' } | " +
        'Select-Object -ExpandProperty ProcessId"',
    );
    if (query.code !== 0) {
      result.notes.push('could not enumerate processes; check for a stray --debug=cli run by hand');
      return [];
    }
    return query.out
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
  }

  const listing = shell('ps -eo pid,args');
  if (listing.code !== 0) return [];
  return listing.out
    .split(/\r?\n/)
    .filter((line) => line.includes(MARKER) && line.includes('playwright') && !line.includes('ps -eo'))
    .map((line) => Number(line.trim().split(/\s+/)[0]))
    .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);
}

result.processes = findDebugProcesses();

if (result.processes.length > 0 && values.kill && !values['dry-run']) {
  for (const pid of result.processes) {
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

const remaining = result.processes.filter((pid) => !result.killed.includes(pid));
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
    console.error(
      `cleanup: ${remaining.length} --debug=cli process(es) still running: ${remaining.join(', ')}` +
        (values.kill ? '' : '\n  pass --kill to terminate them, or stop them yourself'),
    );
  }
  for (const note of result.notes) console.log(`  note: ${note}`);
  if (clean && remaining.length === 0) console.log('cleanup: nothing left holding a browser');
}

process.exit(clean ? 0 : 1);
