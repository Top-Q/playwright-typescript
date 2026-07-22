#!/usr/bin/env node
/**
 * check-stubs — the stub gate for the /gen-test pipeline.
 *
 * The test-creator agent marks infrastructure it could not implement with a
 * `@stub` JSDoc tag and a throwing body. The po-builder agent then fills them
 * in. The catalog builder deliberately ignores unknown JSDoc tags, so `@stub`
 * never shows up in pom-catalog — this script is what makes stubs visible to
 * the orchestrator.
 *
 * Two modes:
 *   check-stubs                 expect zero stubs (default; the "clean" gate)
 *   check-stubs --expect 4      expect exactly four (run after the creator)
 *
 * Zero runtime dependencies beyond Node builtins.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';

const HELP = `
Usage: check-stubs [options]

Reports page-object methods still marked @stub by the test-generation pipeline.

Options:
  -h, --help            Show this help message
      --root <dir>      Directory to scan (default: src/po)
      --expect <n>      Required stub count; exits 1 on any other count (default: 0)
      --run <run-id>    Only count stubs tagged with this run id
      --json            Emit machine-readable JSON instead of a text report
      --quiet           Suppress the success line

Exit codes:
  0  the stub count matched --expect
  1  it did not, or the scan could not run

Examples:
  check-stubs                        # gate: no stubs may remain
  check-stubs --expect 4             # gate: exactly the 4 stubs just declared
  check-stubs --run 2026-07-22-a --json
`;

function fail(message: string): never {
  console.error(`check-stubs: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    root: { type: 'string', default: 'src/po' },
    expect: { type: 'string' },
    run: { type: 'string' },
    json: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

const expected = values.expect === undefined ? 0 : Number(values.expect);
if (!Number.isInteger(expected) || expected < 0) {
  fail(`--expect must be a non-negative integer, got "${values.expect}"`);
}

const repoRoot = process.cwd();
const scanRoot = path.resolve(repoRoot, values.root);
if (!fs.existsSync(scanRoot)) {
  fail(`scan root not found: ${values.root}`);
}

/** A `@stub` tag, or a throwing stub body, found in a page-object source file. */
interface StubHit {
  /** Repo-relative, forward-slashed path. */
  file: string;
  /** 1-indexed line number. */
  line: number;
  /** The run id from `@stub <id>`, when the tag carried one. */
  runId?: string;
  /** Owning method, when it could be determined from the following lines. */
  method?: string;
  /** Which marker matched — a stub is expected to carry both. */
  kind: 'tag' | 'throw';
}

/** Matches `@stub`, optionally followed by a spec ref and a run id. */
const STUB_TAG = /@stub\b[ \t]*(?<rest>[^\r\n*]*)/;
/** Matches the throwing body the creator is required to emit. */
const STUB_THROW = /throw new Error\(\s*['"`]STUB\b/;
/** Matches the method name on a line following a `@stub` tag. */
const METHOD_NAME = /(?:async\s+)?(?<name>[A-Za-z_$][\w$]*)\s*(?:<[^>]*>)?\s*\(/;

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
 * Looks ahead from a `@stub` tag for the method it documents, so the report
 * names the method rather than only a line number. Gives up after leaving the
 * doc block, which keeps a stray tag in prose from claiming an unrelated method.
 */
function findMethodAfter(lines: string[], tagIndex: number): string | undefined {
  for (let i = tagIndex + 1; i < Math.min(tagIndex + 12, lines.length); i++) {
    const line = lines[i];
    if (line.includes('*/')) {
      const next = lines[i + 1];
      if (next === undefined) return undefined;
      return METHOD_NAME.exec(next.trim())?.groups?.name;
    }
  }
  return undefined;
}

const hits: StubHit[] = [];

for (const absolute of listTypeScriptFiles(scanRoot)) {
  const file = path.relative(repoRoot, absolute).split(path.sep).join('/');
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);

  lines.forEach((line, index) => {
    const tag = STUB_TAG.exec(line);
    if (tag) {
      // `@stub FR-MEM-004 run-2026-07-22-a` -> last token is the run id.
      const parts = (tag.groups?.rest ?? '').trim().split(/\s+/).filter(Boolean);
      hits.push({
        file,
        line: index + 1,
        runId: parts.at(-1),
        method: findMethodAfter(lines, index),
        kind: 'tag',
      });
    } else if (STUB_THROW.test(line)) {
      hits.push({ file, line: index + 1, kind: 'throw' });
    }
  });
}

const scoped = values.run === undefined ? hits : hits.filter((hit) => hit.runId === values.run);

// A correctly formed stub has a tag *and* a throw. Count tags so a stub is not
// double-counted, but keep orphan throws visible — an implemented method that
// still throws is exactly the bug this gate exists to catch.
const tags = scoped.filter((hit) => hit.kind === 'tag');
const orphanThrows = scoped.filter(
  (hit) => hit.kind === 'throw' && !tags.some((tag) => tag.file === hit.file),
);
const count = tags.length + orphanThrows.length;

if (values.json) {
  console.log(JSON.stringify({ expected, count, stubs: tags, orphanThrows }, null, 2));
} else if (count > 0) {
  // Matching the expected count is a pass, so the listing goes to stdout and is
  // phrased neutrally; only a mismatch is an error.
  const matched = count === expected;
  const write = matched ? console.log : console.error;
  write(
    matched
      ? `check-stubs: ${count} stub(s) pending implementation:`
      : `check-stubs: ${count} stub(s) found, expected ${expected}:`,
  );
  for (const hit of tags) {
    const what = hit.method ? `${hit.method}()` : '(method not identified)';
    write(`  - ${hit.file}:${hit.line}  ${what}${hit.runId ? `  [${hit.runId}]` : ''}`);
  }
  for (const hit of orphanThrows) {
    write(`  - ${hit.file}:${hit.line}  throws STUB but has no @stub tag`);
  }
}

if (count !== expected) {
  if (!values.json) {
    console.error(
      count > expected
        ? `\nExpected ${expected}, found ${count}. Unfilled stubs must be implemented by po-builder.`
        : `\nExpected ${expected}, found ${count}. Declared stubs are missing from the source.`,
    );
  }
  process.exit(1);
}

if (!values.quiet && !values.json) {
  console.log(
    expected === 0
      ? `check-stubs: clean — no stubs in ${values.root}`
      : `check-stubs: ${count} stub(s), as expected`,
  );
}
