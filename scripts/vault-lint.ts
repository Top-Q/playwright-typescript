#!/usr/bin/env node
/**
 * vault-lint — the checker for the requirement vault (specs/product/vault/).
 *
 * The vault is the source of truth for the requirements, edited in place in
 * Obsidian by people and agents alike. Nothing regenerates it, so nothing
 * repairs it either: this script, run by gate:all, is what stands between an
 * edit and a vault that disagrees with itself. It writes nothing, except with
 * --fix, which rewrites the one derived property (rule 6) from its source.
 *
 * The rules make every fact live in exactly one place:
 *
 *   1. Every link resolves — to a note, a `#heading` in it, or a `#^block`.
 *   2. A note's filename is its `id`.
 *   3. Each kind has a closed schema: required properties, optional ones, and
 *      the kind of note each may link to. Anything else is an error, which is
 *      how reverse lists (`test_cases` on a requirement, `referenced_by` on a
 *      rule) stay out — the reverse direction is a Bases query or a backlink.
 *   4. Titles carry no ids, and an id in prose is a link, never bare text.
 *   5. A precondition does not restate the `actors` property ("Logged in as a
 *      Viewer").
 *   6. A test case's `automated_by` lists exactly the spec files tagged with its
 *      id (`tag: ['@ui', '@TC-WP-004-03']`). The tag is the fact; the property
 *      is a copy for Obsidian, and a copy nobody compares drifts.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';

const HELP = `
Usage: vault-lint [options]

Checks every note in the requirement vault against the rules for its kind.

Options:
  -h, --help          Show this help message
      --vault <dir>   Vault directory (default: specs/product/vault)
      --tests <dir>   Where Playwright specs live (default: tests)
      --fix           Rewrite each test case's automated_by from the @TC-… tags in the tests
`;

type Properties = Record<string, string | string[] | undefined>;

interface Note {
    file: string;
    name: string;
    properties: Properties;
    body: string;
    headings: Set<string>;
    blocks: Set<string>;
    kind?: string;
}

/** For each linking property, the kinds of note it may point at. */
interface Schema {
    required: Record<string, string[]>;
    optional: Record<string, string[]>;
}

const SRS = ['srs-section', 'srs-chapter'];
const RULES = ['business-rule', 'rbac-rule'];

/** An empty list of kinds means the property is plain data, not a link. */
const SCHEMAS: Record<string, Schema> = {
    requirement: {
        required: { id: [], source: SRS },
        optional: {
            stories: ['user-story'],
            business_rules: RULES,
            permission_rows: ['permission'],
            data_fields: ['entity'],
        },
    },
    'test-case': {
        required: {
            id: [],
            type: [],
            title: [],
            requirement: ['requirement'],
            actors: ['user-class'],
            automated_by: [],
        },
        optional: {
            business_rules: RULES,
            permission_rows: ['permission'],
            data_fields: ['entity'],
            nfr: ['nfr'],
            constraints: ['constraint'],
        },
    },
    'user-story': { required: { id: [], source: SRS }, optional: { actor: ['user-class'] } },
    'business-rule': { required: { id: [], source: SRS }, optional: {} },
    'rbac-rule': { required: { id: [], source: SRS }, optional: {} },
    permission: {
        required: {
            action: [],
            admin: [],
            project_manager: [],
            member: [],
            viewer: [],
            source: SRS,
        },
        optional: {},
    },
    'user-class': {
        required: { id: [], name: [], source: SRS },
        optional: { rbac_column: [] },
    },
    entity: { required: { id: [], source: SRS }, optional: {} },
    term: { required: { source: SRS }, optional: {} },
    constraint: { required: { id: [], source: SRS }, optional: {} },
    'design-constraint': {
        required: { id: [], source: SRS, related_frs: ['requirement'] },
        optional: {},
    },
    clarification: {
        required: {
            id: [],
            title: [],
            status: [],
            sources: ['requirement', ...RULES],
            blocks: ['test-case'],
        },
        optional: {},
    },
    nfr: {
        required: { id: [], category: [], source: SRS, related_frs: ['requirement'] },
        optional: {},
    },
    'acceptance-sample': {
        required: { id: [], title: [], source: SRS, exemplifies: ['requirement'] },
        optional: {},
    },
    workflow: { required: { work_package_type: [], source: SRS }, optional: {} },
    srs: {
        required: { document: [], title: [], chapters: ['srs-chapter'] },
        optional: Object.fromEntries(
            [
                'document_type',
                'product',
                'version',
                'status',
                'date',
                'prepared_for',
                'prepared_by',
                'distribution',
            ].map((key) => [key, []]),
        ),
    },
    'srs-chapter': {
        required: { section: [], title: [] },
        optional: { sections: ['srs-section'] },
    },
    'srs-section': { required: { section: [], title: [] }, optional: {} },
    module: { required: {}, optional: {} },
    index: { required: {}, optional: {} },
};

/** Present on every note and never a fact about the requirement. */
const HOUSEKEEPING = new Set(['tags', 'aliases']);

const ID = /\b(?:NFR|FR|TC|US|BR|CQ|AC|RBAC|DC)-[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g;
/** `[[target#anchor|display]]`; inside a table the `|` is escaped as `\|`. */
const LINK = /!?\[\[([^\]|#\\]*)(#\^?[^\]|\\]*)?(?:\\?\|[^\]]*)?\]\]/g;

function parseNote(file: string): Note {
    const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
    const properties = (match ? (load(match[1]) ?? {}) : {}) as Properties;
    const body = match ? match[2] : content;
    const tags = toList(properties.tags);
    return {
        file,
        name: path.basename(file, '.md'),
        properties,
        body,
        headings: new Set(
            [...body.matchAll(/^#{1,6} (.+)$/gm)].map((heading) => heading[1].trim()),
        ),
        blocks: new Set([...body.matchAll(/ \^([\w-]+)$/gm)].map((block) => block[1])),
        kind: tags.find((tag) => tag.startsWith('kind/'))?.slice('kind/'.length),
    };
}

function toList(value: string | string[] | undefined): string[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

/** Every note and every Bases file in the vault; Obsidian's own settings are skipped. */
function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name.startsWith('.')) return [];
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.(md|base)$/.test(full) ? [full] : [];
    });
}

/** Prose only: fenced blocks (Bases queries, diagrams) and inline code are not prose. */
function prose(body: string): string {
    return body.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
}

function lint(notes: Map<string, Note>, bases: Set<string>, note: Note): string[] {
    const problems: string[] = [];
    const where = (message: string): string => `${note.name}: ${message}`;

    /** Resolves one link; returns the target note, or records why it cannot. */
    const resolve = (
        target: string,
        anchor: string | undefined,
        context: string,
    ): Note | undefined => {
        if (target.endsWith('.base')) {
            if (!bases.has(target.toLowerCase())) {
                problems.push(where(`${context} embeds ${target}, which does not exist`));
            }
            return undefined;
        }
        const found = notes.get(target.toLowerCase());
        if (!found) {
            problems.push(where(`${context} links to [[${target}]], which does not exist`));
            return undefined;
        }
        if (anchor?.startsWith('#^') && !found.blocks.has(anchor.slice(2))) {
            problems.push(
                where(`${context} links to block ${anchor} that ${target} does not have`),
            );
        } else if (anchor && !anchor.startsWith('#^') && !found.headings.has(anchor.slice(1))) {
            problems.push(
                where(`${context} links to heading ${anchor} that ${target} does not have`),
            );
        }
        return found;
    };

    // Rule 2: the filename is the id.
    if (note.properties.id !== undefined && note.properties.id !== note.name) {
        problems.push(where(`id "${String(note.properties.id)}" does not match the filename`));
    }

    // Rule 3: a closed schema per kind.
    const schema = note.kind ? SCHEMAS[note.kind] : undefined;
    if (!schema) {
        problems.push(where(`kind "${note.kind ?? '(none)'}" has no schema; add a kind/* tag`));
    } else {
        for (const key of Object.keys(schema.required)) {
            if (!(key in note.properties)) problems.push(where(`missing required property ${key}`));
        }
        for (const [key, value] of Object.entries(note.properties)) {
            if (HOUSEKEEPING.has(key)) continue;
            const kinds = schema.required[key] ?? schema.optional[key];
            if (!kinds) {
                problems.push(
                    where(
                        `property ${key} is not in the ${note.kind} schema — if it lists notes that ` +
                            'point here, it is a reverse link: use a Bases query or the backlinks panel',
                    ),
                );
                continue;
            }
            if (!kinds.length) continue;
            for (const item of toList(value)) {
                LINK.lastIndex = 0;
                const match = LINK.exec(String(item));
                if (!match) {
                    problems.push(where(`property ${key} holds "${String(item)}", not a link`));
                    continue;
                }
                const target = resolve(match[1], match[2], `property ${key}`);
                if (target && !kinds.includes(target.kind ?? '')) {
                    problems.push(
                        where(
                            `property ${key} links to ${target.name}, a ${target.kind ?? 'note without a kind'}; ` +
                                `expected ${kinds.join(' or ')}`,
                        ),
                    );
                }
            }
        }
    }

    // The one fact still stated twice: a test case's module tag repeats its
    // requirement's. A program compares them, so they cannot drift apart.
    if (note.kind === 'test-case') {
        LINK.lastIndex = 0;
        const requirement = notes.get(
            (LINK.exec(String(note.properties.requirement))?.[1] ?? '').toLowerCase(),
        );
        const moduleOf = (target: Note): string[] =>
            toList(target.properties.tags).filter((tag) => tag.startsWith('module/'));
        if (requirement && moduleOf(requirement).join() !== moduleOf(note).join()) {
            problems.push(
                where(
                    `module tag ${moduleOf(note).join(', ') || '(none)'} differs from ` +
                        `${requirement.name}'s ${moduleOf(requirement).join(', ') || '(none)'}`,
                ),
            );
        }
    }

    // Rule 1: every link in the body resolves too.
    for (const match of note.body.replace(/^```[\s\S]*?^```/gm, '').matchAll(LINK)) {
        resolve(match[1], match[2], 'body');
    }

    // Rule 4: ids are never bare text.
    const title = typeof note.properties.title === 'string' ? note.properties.title : '';
    for (const id of title.match(ID) ?? []) {
        problems.push(where(`title mentions ${id}; the relationship belongs in a property`));
    }
    for (const id of prose(note.body).replace(LINK, '').match(ID) ?? []) {
        problems.push(where(`prose mentions ${id} as plain text; make it a link`));
    }

    // Rule 5: actors live in their property, not in a precondition.
    const classes = [...notes.values()].filter((candidate) => candidate.kind === 'user-class');
    const preconditions =
        /^## Preconditions\n([\s\S]*?)(?=^## |$(?![\s\S]))/m.exec(note.body)?.[1] ?? '';
    for (const line of preconditions.split('\n').filter((text) => /Logged in as/i.test(text))) {
        const named = classes.find((userClass) =>
            [userClass.name, ...toList(userClass.properties.aliases)].some((alias) =>
                new RegExp(`\\b${alias}\\b`, 'i').test(line),
            ),
        );
        if (named) {
            problems.push(
                where(
                    `precondition "${line.replace(/^- /, '')}" names ${named.name}; put it in actors`,
                ),
            );
        }
    }
    return problems;
}

// ------------------------------------------------------------ automated_by

/** `'@TC-WP-004-03'` inside a Playwright `tag: [...]`. */
const TEST_CASE_TAG = /['"`]@(TC-[A-Z]+-\d+-\d+)['"`]/g;

function specFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return specFiles(full);
        return entry.name.endsWith('.spec.ts') ? [full] : [];
    });
}

/**
 * Test case id → the spec files tagged with it, repo-relative and sorted.
 *
 * The tag in the test file is the fact; `automated_by` in the vault is a copy,
 * kept so Obsidian can show and query it. A copy nobody compares drifts, so this
 * compares it — and `--fix` rewrites it from the tags.
 */
function taggedTests(repoRoot: string, testsDir: string): Map<string, string[]> {
    const tagged = new Map<string, string[]>();
    for (const file of specFiles(testsDir)) {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        for (const match of fs.readFileSync(file, 'utf8').matchAll(TEST_CASE_TAG)) {
            const files = tagged.get(match[1]) ?? [];
            if (!files.includes(relative)) files.push(relative);
            tagged.set(match[1], files.sort());
        }
    }
    return tagged;
}

/** Rewrites a note's `automated_by` property in place, leaving every other line alone. */
function writeAutomatedBy(note: Note, files: string[]): void {
    const content = fs.readFileSync(note.file, 'utf8').replace(/\r\n/g, '\n');
    const value = files.length
        ? `automated_by:\n${files.map((file) => `  - ${file}`).join('\n')}\n`
        : 'automated_by: []\n';
    fs.writeFileSync(note.file, content.replace(/^automated_by:.*\n(?: {2}- .*\n)*/m, value));
}

// -------------------------------------------------------------------- main

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        help: { type: 'boolean', short: 'h', default: false },
        vault: { type: 'string', default: 'specs/product/vault' },
        tests: { type: 'string', default: 'tests' },
        fix: { type: 'boolean', default: false },
    },
});

if (values.help) {
    console.log(HELP.trim());
    process.exit(0);
}

const repoRoot = process.cwd();
const vaultDir = path.resolve(repoRoot, values.vault);
if (!fs.existsSync(vaultDir)) {
    console.error(`vault-lint: vault not found: ${values.vault}`);
    process.exit(1);
}

const files = walk(vaultDir);
// Obsidian resolves [[Name]] case-insensitively, so lookups do too — keyed by
// the lowercased name. Two files whose names differ only by case are
// ambiguous: `![[Test cases.base]]` once embedded the vault-wide `Test
// Cases.base` instead of the per-requirement query, and a case-sensitive
// lookup called that resolved.
const problems: string[] = [];
const byName = new Map<string, string[]>();
for (const file of files) {
    const key = path.basename(file).toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), path.relative(vaultDir, file)]);
}
for (const [, clashing] of byName) {
    if (clashing.length > 1) {
        problems.push(
            `${clashing.join(' and ')}: names differ only by case, so a link to either is ambiguous`,
        );
    }
}
const notes = new Map(
    files
        .filter((file) => file.endsWith('.md'))
        .map((file) => [path.basename(file, '.md').toLowerCase(), parseNote(file)]),
);
const bases = new Set(
    files.filter((file) => file.endsWith('.base')).map((file) => path.basename(file).toLowerCase()),
);
problems.push(...[...notes.values()].flatMap((note) => lint(notes, bases, note)));

const tagged = taggedTests(repoRoot, path.resolve(repoRoot, values.tests));
let fixed = 0;
for (const [id, testFiles] of tagged) {
    if (notes.get(id.toLowerCase())?.kind !== 'test-case') {
        problems.push(
            `${testFiles.join(', ')}: tagged @${id}, which is not a test case in the vault`,
        );
    }
}
for (const note of notes.values()) {
    if (note.kind !== 'test-case') continue;
    const expected = tagged.get(note.name) ?? [];
    const actual = toList(note.properties.automated_by).map(String).sort();
    if (actual.join('\n') === expected.join('\n')) continue;
    if (values.fix) {
        writeAutomatedBy(note, expected);
        fixed++;
    } else {
        problems.push(
            `${note.name}: automated_by is [${actual.join(', ')}] but the tests tagged ` +
                `@${note.name} are [${expected.join(', ')}] — run \`npm.cmd run vault:lint -- --fix\``,
        );
    }
}
if (fixed)
    console.log(`vault-lint: rewrote automated_by on ${fixed} test case(s) from the test tags`);

problems.forEach((problem) => console.error(problem));
if (problems.length) {
    console.error(`vault-lint: ${problems.length} problem(s) in ${notes.size} note(s)`);
    process.exit(1);
}
console.log(`vault-lint: ${notes.size} note(s), no problems`);
