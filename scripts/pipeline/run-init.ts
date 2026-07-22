#!/usr/bin/env node
/**
 * run-init — opens a run directory for the /gen-test pipeline.
 *
 * Subagents cannot see each other's context, so every stage hands off through
 * files under .pipeline/runs/<run-id>/. This script creates that directory and
 * seeds it with the two artifacts stage 1 needs: run.json (the machine-readable
 * run record) and spec.md (the normalised, human-readable specification).
 *
 * A spec reference is one of:
 *   FR-MEM-001        a functional requirement — expands to all of its test cases
 *   TC-MEM-001-02     a single test case within a requirement
 *   path/to/spec.md   a free-form markdown spec, copied through verbatim
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';

const HELP = `
Usage: run-init --spec <ref> [options]

Creates .pipeline/runs/<run-id>/ with run.json and spec.md.

Options:
  -h, --help              Show this help message
      --spec <ref>        Required. FR id, TC id, or path to a markdown spec
      --graph <dir>       Requirements graph directory (default: requirements/graph)
      --out <dir>         Runs root (default: .pipeline/runs)
      --run-id <id>       Override the generated run id
      --branch <name>     Record the git branch this run belongs to
      --json              Print the run record as JSON (default: a short summary)

Examples:
  run-init --spec FR-MEM-001
  run-init --spec TC-MEM-001-02 --branch test-gen/tc-mem-001-02
  run-init --spec specs/create-task-plan.md
`;

function fail(message: string): never {
  console.error(`run-init: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    spec: { type: 'string' },
    graph: { type: 'string', default: 'requirements/graph' },
    out: { type: 'string', default: '.pipeline/runs' },
    'run-id': { type: 'string' },
    branch: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}
if (!values.spec) fail('--spec is required (an FR id, a TC id, or a markdown path)');

const repoRoot = process.cwd();
const specRef = values.spec.trim();

/** One test case as stored in a requirements/graph/FR-*.yaml file. */
interface TestCase {
  id?: string;
  type?: string;
  title?: string;
  preconditions?: string[];
  steps?: string[];
  expected_result?: string;
}

/** The shape of a requirements/graph/FR-*.yaml document. */
interface Requirement {
  id?: string;
  module?: string;
  text?: string;
  business_rules?: string[];
  data_fields?: string[];
  test_cases?: TestCase[];
}

const FR_ID = /^FR-[A-Z]+-\d+$/;
const TC_ID = /^TC-(?<fr>[A-Z]+-\d+)-(?<index>\d+)$/;

/** `members-roles` -> `members`; the PO/test directory the module maps onto. */
function moduleDirectory(module: string | undefined): string {
  if (!module) return 'misc';
  return module.split(/[-_/]/)[0].toLowerCase();
}

function kebab(text: string): string {
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

function readRequirement(frId: string): { requirement: Requirement; file: string } {
  const file = path.resolve(repoRoot, values.graph, `${frId}.yaml`);
  if (!fs.existsSync(file)) {
    fail(`requirement not found: ${path.relative(repoRoot, file).split(path.sep).join('/')}`);
  }
  const parsed = load(fs.readFileSync(file, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    fail(`requirement ${frId} did not parse into an object`);
  }
  return {
    requirement: parsed as Requirement,
    file: path.relative(repoRoot, file).split(path.sep).join('/'),
  };
}

/** Renders one test case as a Given/When/Then block for the test-creator. */
function renderTestCase(testCase: TestCase, requirement: Requirement): string {
  const lines: string[] = [];
  lines.push(`## ${testCase.id ?? '(unidentified)'} — ${testCase.title ?? 'Untitled'}`);
  lines.push('');
  lines.push(`- **Type:** ${testCase.type ?? 'unspecified'}`);
  lines.push(`- **Requirement:** ${requirement.id ?? '?'} — ${requirement.text?.trim() ?? ''}`);
  lines.push('');

  lines.push('### Scenario');
  lines.push('');
  (testCase.preconditions ?? []).forEach((precondition, index) => {
    lines.push(`${index === 0 ? 'Given' : 'And'} ${precondition}`);
  });
  const steps = testCase.steps ?? [];
  steps.forEach((step, index) => {
    lines.push(`${index === 0 ? 'When' : 'And'} ${step}`);
  });
  if (testCase.expected_result) {
    lines.push(`Then ${testCase.expected_result.trim().replace(/\s+/g, ' ')}`);
  }
  lines.push('');
  return lines.join('\n');
}

interface RunRecord {
  runId: string;
  specRef: string;
  specKind: 'requirement' | 'test-case' | 'markdown';
  sourceFile: string;
  specPath: string;
  module: string;
  suggestedTestFile: string;
  testCaseIds: string[];
  branch: string | null;
  createdAt: string;
  status: 'initialised';
  stages: [];
}

let specMarkdown: string;
let module: string;
let sourceFile: string;
let specKind: RunRecord['specKind'];
let testCaseIds: string[] = [];
let slug: string;

if (FR_ID.test(specRef)) {
  specKind = 'requirement';
  const { requirement, file } = readRequirement(specRef);
  sourceFile = file;
  module = moduleDirectory(requirement.module);
  const cases = requirement.test_cases ?? [];
  if (cases.length === 0) fail(`${specRef} declares no test_cases`);
  testCaseIds = cases.map((testCase, index) => testCase.id ?? `${specRef}-${index + 1}`);
  slug = kebab(specRef);
  specMarkdown = [
    `# ${specRef}`,
    '',
    `> ${requirement.text?.trim().replace(/\s+/g, ' ') ?? ''}`,
    '',
    `Source: \`${file}\` · Module: \`${module}\` · ${cases.length} test case(s)`,
    '',
    '---',
    '',
    ...cases.map((testCase) => renderTestCase(testCase, requirement)),
  ].join('\n');
} else if (TC_ID.test(specRef)) {
  specKind = 'test-case';
  const frId = `FR-${TC_ID.exec(specRef)?.groups?.fr ?? ''}`;
  const { requirement, file } = readRequirement(frId);
  sourceFile = file;
  module = moduleDirectory(requirement.module);
  const testCase = (requirement.test_cases ?? []).find((candidate) => candidate.id === specRef);
  if (!testCase) fail(`${frId} contains no test case with id ${specRef}`);
  testCaseIds = [specRef];
  slug = kebab(testCase.title ?? specRef);
  specMarkdown = [
    `# ${specRef}`,
    '',
    `Source: \`${file}\` · Module: \`${module}\``,
    '',
    '---',
    '',
    renderTestCase(testCase, requirement),
  ].join('\n');
} else {
  specKind = 'markdown';
  const file = path.resolve(repoRoot, specRef);
  if (!fs.existsSync(file)) {
    fail(`spec reference is neither an FR id, a TC id, nor an existing file: ${specRef}`);
  }
  sourceFile = path.relative(repoRoot, file).split(path.sep).join('/');
  specMarkdown = fs.readFileSync(file, 'utf8');
  module = moduleDirectory(path.basename(file, path.extname(file)));
  slug = kebab(path.basename(file, path.extname(file)));
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, 19);
const runId = values['run-id'] ?? `${kebab(specRef)}-${stamp}`;

const runDir = path.resolve(repoRoot, values.out, runId);
if (fs.existsSync(runDir)) fail(`run directory already exists: ${runId}`);
fs.mkdirSync(path.join(runDir, 'test-run'), { recursive: true });

const specPath = path.join(runDir, 'spec.md');
fs.writeFileSync(specPath, `${specMarkdown.trimEnd()}\n`, 'utf8');

const record: RunRecord = {
  runId,
  specRef,
  specKind,
  sourceFile,
  specPath: path.relative(repoRoot, specPath).split(path.sep).join('/'),
  module,
  suggestedTestFile: `tests/ui/${module}/${slug}.spec.ts`,
  testCaseIds,
  branch: values.branch ?? null,
  createdAt: now.toISOString(),
  status: 'initialised',
  stages: [],
};

const runJsonPath = path.join(runDir, 'run.json');
fs.writeFileSync(runJsonPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

const runDirRelative = path.relative(repoRoot, runDir).split(path.sep).join('/');

if (values.json) {
  console.log(JSON.stringify({ ...record, runDir: runDirRelative }, null, 2));
} else {
  console.log(`run-init: ${runId}`);
  console.log(`  spec        ${specRef} (${specKind}) from ${sourceFile}`);
  console.log(`  module      ${module}`);
  console.log(`  test cases  ${testCaseIds.length > 0 ? testCaseIds.join(', ') : '(free-form)'}`);
  console.log(`  run dir     ${runDirRelative}`);
  console.log(`  suggested   ${record.suggestedTestFile}`);
}
