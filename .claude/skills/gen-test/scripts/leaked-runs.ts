/**
 * leaked-runs — finds Playwright test runs from this checkout that are still alive.
 *
 * A leaked run holds a browser and a port, so the next stage dies with
 * `browser.bind: Server is already started` and the failure looks like the new
 * stage's fault. `cleanup` sweeps them at the end of a run; `preflight` reports
 * them at the start, because a leak inherited from an earlier session is a
 * precondition problem that the end of *this* run cannot fix.
 *
 * This replaces a match on the literal `--debug=cli`. That flag is one *way of
 * starting* a run, not a property of one: runs leaked by any other recipe — the
 * scratch-spec CDP holder `browser.md` used to document, a plain `playwright
 * test` left paused — carried no such flag and were invisible. The observed
 * consequence was `cleanup --kill` printing "nothing left holding a browser" and
 * exiting 0 with four leaked processes alive, the oldest for five days.
 *
 * What actually identifies a leak is that the process is the Playwright
 * **runner**, executing tests, out of **this** checkout. Long-lived tooling that
 * merely looks similar is excluded by name: `test-server` backs the VS Code
 * extension, and `@playwright/mcp` is the MCP server. Neither is a leaked run,
 * and killing either would break a tool the user is still using.
 */

import { spawnSync } from 'node:child_process';

export interface LeakedRun {
  pid: number;
  /** Trimmed for display; the full line is rarely readable in a report. */
  commandLine: string;
  /**
   * True when no other matched process is an ancestor of this one. A single
   * leaked `npx playwright test` is four processes — shell wrapper, `cmd.exe`
   * shim, npx, runner — and killing the root with `/T` takes the whole tree, so
   * roots are what to count and what to terminate.
   */
  root: boolean;
}

interface RawProcess {
  ProcessId?: number;
  ParentProcessId?: number;
  CommandLine?: string | null;
}

function normalise(value: string): string {
  return value.replace(/\\+/g, '/').toLowerCase();
}

/** Long-lived Playwright tooling that is not a test run. */
function isTooling(line: string): boolean {
  return /test-server|@playwright\/mcp/.test(line);
}

/** `playwright test …` (via npx) or `@playwright/test/cli.js test …` (direct). */
function runsTests(line: string): boolean {
  return /playwright\s+test\s/.test(line) || /@playwright\/test\/cli\.js"?\s+test\s/.test(line);
}

function shell(command: string): { code: number; out: string } {
  const spawned = spawnSync(command, { encoding: 'utf8', shell: true, windowsHide: true });
  return {
    code: spawned.error ? 127 : (spawned.status ?? 1),
    out: `${spawned.stdout ?? ''}${spawned.stderr ?? ''}`.trim(),
  };
}

/**
 * The whole process table, not just node.
 *
 * An `npx playwright test …` wrapper reaches its runner through a `cmd.exe`
 * shim, so a parent walk restricted to node processes stops at the shim and the
 * wrapper is never attributed to the run it started. Enumerating everything
 * costs about a second and makes the ancestor walk actually connect.
 */
function listProcesses(): { ok: boolean; processes: RawProcess[] } {
  if (process.platform === 'win32') {
    const query = shell(
      'powershell -NoProfile -Command "Get-CimInstance Win32_Process | ' +
        'Select-Object ProcessId, ParentProcessId, CommandLine | ConvertTo-Json -Compress"',
    );
    if (query.code !== 0 || !query.out) return { ok: query.code === 0, processes: [] };
    try {
      const parsed: unknown = JSON.parse(query.out);
      // ConvertTo-Json emits a bare object when exactly one process matched.
      const list: RawProcess[] = Array.isArray(parsed)
        ? (parsed as RawProcess[])
        : [parsed as RawProcess];
      return { ok: true, processes: list };
    } catch {
      return { ok: false, processes: [] };
    }
  }

  const listing = shell('ps -eo pid=,ppid=,args=');
  if (listing.code !== 0) return { ok: false, processes: [] };
  const processes = listing.out
    .split(/\r?\n/)
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({
      ProcessId: Number(match[1]),
      ParentProcessId: Number(match[2]),
      CommandLine: match[3],
    }));
  return { ok: true, processes };
}

/**
 * Test runs belonging to `repoRoot` that are still alive.
 *
 * The npx wrapper (`npx playwright test …`) carries only the relative spec path,
 * so it cannot be attributed to a checkout on its own. It is included when it is
 * the **parent** of a run that could be — which is how the two-process pair a
 * leaked `npx` invocation leaves behind gets reported and killed as one unit.
 *
 * @param repoRoot - Absolute path to the checkout to scope the search to.
 * @param selfPid - Excluded from the results; defaults to this process.
 */
export function findLeakedTestRuns(repoRoot: string, selfPid = process.pid): {
  /** False when the process table could not be read at all. */
  enumerated: boolean;
  runs: LeakedRun[];
} {
  const { ok, processes } = listProcesses();
  if (!ok) return { enumerated: false, runs: [] };

  const root = normalise(repoRoot);
  const byPid = new Map<number, RawProcess>();
  for (const entry of processes) {
    if (typeof entry?.ProcessId === 'number') byPid.set(entry.ProcessId, entry);
  }

  const matched = new Map<number, string>();
  const consider = (entry: RawProcess | undefined, requireRoot: boolean): void => {
    if (!entry || typeof entry.ProcessId !== 'number') return;
    if (entry.ProcessId === selfPid || matched.has(entry.ProcessId)) return;
    const line = normalise(entry.CommandLine ?? '');
    if (!line || isTooling(line) || !runsTests(line)) return;
    if (requireRoot && !line.includes(root)) return;
    matched.set(entry.ProcessId, (entry.CommandLine ?? '').trim());
  };

  for (const entry of processes) consider(entry, true);
  // Pull in each match's wrapper, which names no checkout of its own. It sits a
  // couple of levels up through a shell shim, so walk the chain rather than
  // checking the immediate parent — bounded, because a cycle in the table would
  // otherwise hang the sweep.
  for (const pid of [...matched.keys()]) {
    let current = byPid.get(pid)?.ParentProcessId;
    for (let depth = 0; depth < 5 && typeof current === 'number'; depth += 1) {
      const ancestor = byPid.get(current);
      if (!ancestor) break;
      consider(ancestor, false);
      current = ancestor.ParentProcessId;
    }
  }

  const hasMatchedAncestor = (pid: number): boolean => {
    let current = byPid.get(pid)?.ParentProcessId;
    for (let depth = 0; depth < 10 && typeof current === 'number'; depth += 1) {
      if (matched.has(current)) return true;
      current = byPid.get(current)?.ParentProcessId;
    }
    return false;
  };

  return {
    enumerated: true,
    runs: [...matched.entries()]
      .map(([pid, commandLine]) => ({ pid, commandLine, root: !hasMatchedAncestor(pid) }))
      .sort((a, b) => a.pid - b.pid),
  };
}

/** One-line form for a report: the spec being run matters, the node path does not. */
export function describeRun(run: LeakedRun): string {
  const trimmed = run.commandLine
    .replace(/^"[^"]*"\s*/, '')
    .replace(/^\S*[/\\]node(\.exe)?"?\s*/i, '')
    .replace(/\S*[/\\](npx-cli|cli)\.js"?\s*/gi, '');
  return `${run.pid}  ${trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed}`;
}
