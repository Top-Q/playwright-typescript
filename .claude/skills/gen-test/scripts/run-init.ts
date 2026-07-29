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
 *
 * It is also a library: `preflight` calls `initRun()` directly, because the run
 * id has to exist before the branch is created and re-deriving it in a second
 * place is what let the id and the branch name drift apart.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { requireFlagsSurvived } from './cli-args';
import { PipelineError, RunRecord, isMain, kebab, makeRunId, toPosix } from './run-directory';

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

/** Where a spec's `module:` lands in the repository. */
export interface ModuleDirs {
  /** `src/po/openproject/<po>/` and `pom-catalog/openproject/<po>.json`. */
  po: string;
  /** `tests/ui/<tests>/`. */
  tests: string;
}

/**
 * The `module:` value in a requirement names a business area. The repository
 * names two directories, and they do not always agree — `boards` lives in
 * `src/po/openproject/board` but `tests/ui/boards` — so no single derived
 * string can serve both.
 *
 * This replaces `module.split(/[-_/]/)[0]`, which took everything before the
 * first hyphen. That produced the right answer for exactly one of the four
 * modules in `requirements/graph/`: `members-roles` -> `members`. `work-packages`
 * became `work` and `boards` stayed plural, so 23 of 34 requirements resolved to
 * a directory and a catalog file that do not exist — and a well-covered module
 * then presents as bare, sending the run through investigation and scaffolding to
 * rebuild page objects it already had.
 *
 * A table is wrong in a way somebody notices: preflight checks the resolved
 * directory and says so, rather than the mismatch surfacing three stages later.
 */
const MODULE_MAP: Record<string, ModuleDirs> = {
  'members-roles': { po: 'members', tests: 'members' },
  'work-packages': { po: 'workpackage', tests: 'workpackage' },
  boards: { po: 'board', tests: 'boards' },
  projects: { po: 'projects', tests: 'projects' },
};

export function moduleDirectories(module: string | undefined): ModuleDirs {
  if (!module?.trim()) return { po: 'misc', tests: 'misc' };
  const key = module.trim().toLowerCase();
  const mapped = MODULE_MAP[key];
  if (mapped) return mapped;
  // An unmapped value is a module nobody has added yet, or a markdown spec named
  // after its file. Keep it whole rather than guessing a shorter name: preflight
  // reports that the directory does not exist, which is the honest signal, and
  // for a genuinely new module that is exactly what stage 2.5 is for.
  const fallback = key.replace(/[^a-z0-9]+/g, '');
  return { po: fallback, tests: fallback };
}

function readRequirement(repoRoot: string, graph: string, frId: string): {
  requirement: Requirement;
  file: string;
} {
  const file = path.resolve(repoRoot, graph, `${frId}.yaml`);
  if (!fs.existsSync(file)) {
    throw new PipelineError(`requirement not found: ${toPosix(path.relative(repoRoot, file))}`);
  }
  const parsed = load(fs.readFileSync(file, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null) {
    throw new PipelineError(`requirement ${frId} did not parse into an object`);
  }
  return {
    requirement: parsed as Requirement,
    file: toPosix(path.relative(repoRoot, file)),
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

export interface InitOptions {
  /** An FR id, a TC id, or a path to a markdown spec. */
  specRef: string;
  repoRoot?: string;
  graph?: string;
  /** Runs root, repo-relative. */
  out?: string;
  /** Pre-derived id; preflight passes one so the branch can be created first. */
  runId?: string;
  branch?: string | null;
  now?: Date;
}

export interface InitResult {
  record: RunRecord;
  /** Repo-relative, forward-slashed. */
  runDir: string;
}

/**
 * Creates the run directory and seeds run.json and spec.md.
 *
 * @throws PipelineError if the spec cannot be resolved or the run id is taken.
 */
export function initRun(options: InitOptions): InitResult {
  const repoRoot = options.repoRoot ?? process.cwd();
  const graph = options.graph ?? 'requirements/graph';
  const out = options.out ?? '.pipeline/runs';
  const now = options.now ?? new Date();
  const specRef = options.specRef.trim();
  if (!specRef) throw new PipelineError('a spec reference is required');

  let specMarkdown: string;
  let dirs: ModuleDirs;
  let sourceFile: string;
  let specKind: RunRecord['specKind'];
  let testCaseIds: string[] = [];
  let slug: string;

  if (FR_ID.test(specRef)) {
    specKind = 'requirement';
    const { requirement, file } = readRequirement(repoRoot, graph, specRef);
    sourceFile = file;
    dirs = moduleDirectories(requirement.module);
    const cases = requirement.test_cases ?? [];
    if (cases.length === 0) throw new PipelineError(`${specRef} declares no test_cases`);
    testCaseIds = cases.map((testCase, index) => testCase.id ?? `${specRef}-${index + 1}`);
    slug = kebab(specRef);
    specMarkdown = [
      `# ${specRef}`,
      '',
      `> ${requirement.text?.trim().replace(/\s+/g, ' ') ?? ''}`,
      '',
      `Source: \`${file}\` · Module: \`${dirs.po}\` · ${cases.length} test case(s)`,
      '',
      '---',
      '',
      ...cases.map((testCase) => renderTestCase(testCase, requirement)),
    ].join('\n');
  } else if (TC_ID.test(specRef)) {
    specKind = 'test-case';
    const frId = `FR-${TC_ID.exec(specRef)?.groups?.fr ?? ''}`;
    const { requirement, file } = readRequirement(repoRoot, graph, frId);
    sourceFile = file;
    dirs = moduleDirectories(requirement.module);
    const testCase = (requirement.test_cases ?? []).find((candidate) => candidate.id === specRef);
    if (!testCase) throw new PipelineError(`${frId} contains no test case with id ${specRef}`);
    testCaseIds = [specRef];
    slug = kebab(testCase.title ?? specRef);
    specMarkdown = [
      `# ${specRef}`,
      '',
      `Source: \`${file}\` · Module: \`${dirs.po}\``,
      '',
      '---',
      '',
      renderTestCase(testCase, requirement),
    ].join('\n');
  } else {
    specKind = 'markdown';
    const file = path.resolve(repoRoot, specRef);
    if (!fs.existsSync(file)) {
      throw new PipelineError(
        `spec reference is neither an FR id, a TC id, nor an existing file: ${specRef}`,
      );
    }
    sourceFile = toPosix(path.relative(repoRoot, file));
    specMarkdown = fs.readFileSync(file, 'utf8');
    dirs = moduleDirectories(path.basename(file, path.extname(file)));
    slug = kebab(path.basename(file, path.extname(file)));
  }

  const runId = options.runId ?? makeRunId(specRef, now);
  const runDir = path.resolve(repoRoot, out, runId);
  if (fs.existsSync(runDir)) throw new PipelineError(`run directory already exists: ${runId}`);
  fs.mkdirSync(path.join(runDir, 'test-run'), { recursive: true });

  const specPath = path.join(runDir, 'spec.md');
  fs.writeFileSync(specPath, `${specMarkdown.trimEnd()}\n`, 'utf8');

  const record: RunRecord = {
    runId,
    specRef,
    specKind,
    sourceFile,
    specPath: toPosix(path.relative(repoRoot, specPath)),
    module: dirs.po,
    testDirectory: dirs.tests,
    suggestedTestFile: `tests/ui/${dirs.tests}/${slug}.spec.ts`,
    testCaseIds,
    branch: options.branch ?? null,
    createdAt: now.toISOString(),
    status: 'initialised',
    stages: [],
  };

  fs.writeFileSync(
    path.join(runDir, 'run.json'),
    `${JSON.stringify(record, null, 2)}\n`,
    'utf8',
  );

  return { record, runDir: toPosix(path.relative(repoRoot, runDir)) };
}

if (isMain('run-init.ts')) {
  requireFlagsSurvived('pipeline:init');

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
  if (!values.spec) {
    console.error('run-init: --spec is required (an FR id, a TC id, or a markdown path)');
    process.exit(1);
  }

  try {
    const { record, runDir } = initRun({
      specRef: values.spec,
      graph: values.graph,
      out: values.out,
      runId: values['run-id'],
      branch: values.branch,
    });

    if (values.json) {
      console.log(JSON.stringify({ ...record, runDir }, null, 2));
    } else {
      console.log(`run-init: ${record.runId}`);
      console.log(`  spec        ${record.specRef} (${record.specKind}) from ${record.sourceFile}`);
      console.log(`  module      ${record.module}`);
      console.log(
        `  test cases  ${record.testCaseIds.length > 0 ? record.testCaseIds.join(', ') : '(free-form)'}`,
      );
      console.log(`  run dir     ${runDir}`);
      console.log(`  suggested   ${record.suggestedTestFile}`);
    }
  } catch (error) {
    console.error(`run-init: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
