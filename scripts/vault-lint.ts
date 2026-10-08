#!/usr/bin/env node
/**
 * vault-lint — the checker for the requirement vault (specs/product/vault/).
 *
 * The vault is the source of truth for the requirements, edited in place in
 * Obsidian by people and agents alike. Nothing regenerates it, so nothing
 * repairs it either: this script, run by gate:all, is what stands between an
 * edit and a vault that disagrees with itself. It writes nothing, except with
 * --fix, which rewrites what is derived: the notes in `Automated Tests/` from
 * the tests (rule 6), `Dashboard.md` from everything, and approved_hash
 * (rule 10) — recorded or revoked, never invented.
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
 *   6. Every test under tests/ui and tests/api has a note in `Automated Tests/`
 *      saying exactly what the code says: its title, mode, the test cases its
 *      `@TC-…` tags cover, and the approved text of each it was built from (a
 *      `built-from` annotation, required for every `@TC-…` tag). The code is the
 *      fact; the note is a copy for Obsidian, and a copy nobody compares drifts.
 *      Links run test → test case, so a test case lists its tests through a
 *      Bases query, never a property. Directories in OUTSIDE_THE_VAULT test
 *      another application: they get no note, and may not cover a test case.
 *   7. Each kind has a closed set of `##` body sections, and its required ones
 *      are present and not empty. Part of a note's structure is Markdown — a
 *      test case's steps are the list under `## Steps` — and /gen-test finds
 *      it by heading name, so `## Test steps` would hand it a test with none.
 *   8. Nothing is left from a template: no `TODO` placeholder, and every
 *      `module/*` tag names a module hub (a template's `module/MODULE` does not).
 *   9. Every property is declared in `.obsidian/types.json`, as a list type
 *      exactly when its values are lists, so Obsidian's editor does not guess.
 *  10. A test case carries two checkboxes, `approved` and the optional
 *      `rejected`; neither ticked is a draft, and both ticked is an error. An
 *      approval holds only for the text a person approved: `approved_hash`
 *      records a hash of that text, and once the text changes the approval is
 *      stale and --fix unticks it. --fix records an approval a person gave and
 *      revokes a stale one — it never approves anything itself. A rejected test
 *      case says why under `## Notes`.
 *
 * `_templates/` holds the templates Obsidian creates notes from; it is not
 * linted, and nothing else reads it.
 */

import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import {
    AutomatedTest,
    BUILT_FROM,
    CoveredCase,
    NOTES_FOLDER,
    OUTSIDE_THE_VAULT,
    noteName,
    readAutomatedTests,
    renderNote,
    staleCases,
} from './automated-tests';
import { renderDashboard } from './vault-dashboard';

const HELP = `
Usage: vault-lint [options]

Checks every note in the requirement vault against the rules for its kind.

Options:
  -h, --help          Show this help message
      --vault <dir>   Vault directory (default: specs/product/vault)
      --tests <dirs>  Comma-separated directories of the tests the vault tracks
                      (default: tests/ui,tests/api)
      --fix           Record approved_hash on a newly approved test case, untick one
                      whose text changed since its approval, and rewrite Automated Tests/
                      and Dashboard.md from the tests
`;

type Properties = Record<string, string | string[] | undefined>;

interface Note {
    file: string;
    name: string;
    properties: Properties;
    body: string;
    headings: Set<string>;
    blocks: Set<string>;
    /** `## heading` → the text under it, in document order. */
    sections: Map<string, string>;
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
            approved: [],
        },
        optional: {
            rejected: [],
            approved_hash: [],
            business_rules: RULES,
            permission_rows: ['permission'],
            data_fields: ['entity'],
            nfr: ['nfr'],
            constraints: ['constraint'],
        },
    },
    'automated-test': {
        required: {
            title: [],
            file: [],
            mode: [],
            covers: ['test-case'],
            built_from: [],
            stale: ['test-case'],
        },
        optional: {},
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
    // Generated by --fix (rule 6); its layout is free, like an index note's.
    dashboard: { required: {}, optional: {} },
    index: { required: {}, optional: {} },
};

/** Present on every note and never a fact about the requirement. */
const HOUSEKEEPING = new Set(['tags', 'aliases']);

/**
 * The `##` sections each kind may have, and the ones it must have. A section
 * that is present is never empty. `Notes` and `Evidence` (rule 29) are allowed
 * on every kind. A kind missing from this table — index notes, module hubs, the
 * SRS root — is laid out freely, because nothing reads its body.
 */
const BODY: Record<string, { required: string[]; optional?: string[] }> = {
    requirement: { required: ['Requirement', 'Test cases', 'Referenced by'] },
    // vault.ts, which hands /gen-test its spec, reads these three. Preconditions
    // is optional: a test case whose only setup is who runs it states that in
    // `actors`, and vault.ts turns it into the first precondition.
    'test-case': {
        required: ['Steps', 'Expected result', 'Automated by'],
        optional: ['Preconditions'],
    },
    // Generated (rule 6): one line of prose saying so, and no sections.
    'automated-test': { required: [] },
    'user-story': { required: ['Story', 'Referenced by'] },
    'business-rule': { required: ['Rule', 'Referenced by'] },
    'rbac-rule': { required: ['Rule', 'Referenced by'] },
    'acceptance-sample': { required: ['Criteria'] },
    entity: { required: ['Relationships', 'Attributes', 'Referenced by'] },
    'user-class': { required: ['RBAC matrix column', 'Referenced by'] },
    nfr: { required: ['Referenced by'] },
    permission: { required: ['Referenced by'] },
    constraint: { required: ['Referenced by'] },
    'design-constraint': { required: ['Referenced by'] },
    term: { required: ['Referenced by'] },
    workflow: { required: ['Referenced by'] },
    'srs-chapter': { required: ['Referenced by'] },
    'srs-section': { required: ['Referenced by'] },
    // A clarification is prose — status, source, question — with no sections.
    clarification: { required: [] },
};
const ANY_KIND_SECTIONS = ['Notes', 'Evidence'];

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
        sections: readSections(body),
        kind: tags.find((tag) => tag.startsWith('kind/'))?.slice('kind/'.length),
    };
}

/** `## heading` → its text; a repeated heading keeps both texts, joined. */
function readSections(body: string): Map<string, string> {
    const sections = new Map<string, string>();
    const parts = body.split(/^## (.+)$/m);
    for (let index = 1; index < parts.length; index += 2) {
        const heading = parts[index].trim();
        const text = parts[index + 1].trim();
        sections.set(heading, [sections.get(heading), text].filter(Boolean).join('\n'));
    }
    return sections;
}

function toList(value: string | string[] | undefined): string[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

/** Every note and every Bases file in the vault; Obsidian's own settings are skipped. */
function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        // Obsidian's settings, and the templates new notes are created from.
        if (entry.name.startsWith('.') || entry.name === '_templates') return [];
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

        // Rule 10: checkboxes, not both ticked, and a rejection says why.
        for (const key of CHECKBOXES) {
            const value = note.properties[key];
            if (value !== undefined && typeof value !== 'boolean') {
                problems.push(
                    where(`${key} is "${String(value)}"; it is a checkbox — true or false`),
                );
            }
        }
        if (isTicked(note, 'approved') && isTicked(note, 'rejected')) {
            problems.push(where('is both approved and rejected; untick one'));
        }
        if (isTicked(note, 'rejected') && !note.sections.has('Notes')) {
            problems.push(where('is rejected but has no "## Notes" section saying why'));
        }
    }

    // Rule 7: the body's sections, which is where half a test case lives.
    const body = note.kind ? BODY[note.kind] : undefined;
    if (body) {
        const allowed = new Set([...body.required, ...(body.optional ?? []), ...ANY_KIND_SECTIONS]);
        for (const heading of body.required) {
            if (!note.sections.has(heading)) {
                problems.push(where(`missing the "## ${heading}" section`));
            }
        }
        for (const [heading, text] of note.sections) {
            if (!text) {
                problems.push(where(`the "## ${heading}" section is empty; fill it or remove it`));
            }
            if (!allowed.has(heading)) {
                problems.push(
                    where(
                        `unexpected section "## ${heading}"; a ${note.kind} has ` +
                            [...allowed].map((name) => `"## ${name}"`).join(', '),
                    ),
                );
            }
        }
    }

    // Rule 8: a note created from a template has been filled in.
    const frontmatter = JSON.stringify(note.properties);
    if (/\bTODO\b/.test(frontmatter) || /\bTODO\b/.test(note.body)) {
        problems.push(where('still holds a TODO placeholder from its template'));
    }
    for (const tag of toList(note.properties.tags).filter((t) => t.startsWith('module/'))) {
        const module = tag.slice('module/'.length);
        if (notes.get(module.toLowerCase())?.kind !== 'module') {
            problems.push(where(`tag ${tag} names no module hub (Modules/${module}.md)`));
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

// ---------------------------------------------------------------- approval

/** A test case's review checkboxes. Unticked or absent, either one is false. */
const CHECKBOXES = ['approved', 'rejected'];

function isTicked(note: Note, key: string): boolean {
    return String(note.properties[key]) === 'true';
}

/** Not part of what a person approves: the review itself, derived and housekeeping properties. */
const NOT_APPROVED = new Set([...CHECKBOXES, 'approved_hash', ...HOUSEKEEPING]);

/**
 * A hash of everything a person approves when approving a test case: its
 * properties (type, title, requirement, actors, rules …) and the sections a
 * test is generated from. `## Notes` is left out, so discussing a test case
 * does not revoke its approval. An embedded block (`![[TC-X#^setup]]`) counts
 * as the text it shows, so editing the block revokes every test case that
 * embeds it, not only the one it lives in.
 */
function approvalHash(notes: Map<string, Note>, note: Note): string {
    const properties = Object.keys(note.properties)
        .filter((key) => !NOT_APPROVED.has(key))
        .sort()
        .map((key) => [key, note.properties[key]]);
    const embedded = (text: string): string =>
        text.replace(/!\[\[([^\]|#]+)#\^([\w-]+)\]\]/g, (embed, target: string, block: string) => {
            const body = notes.get(target.toLowerCase())?.body ?? '';
            return new RegExp(`^(.*) \\^${block}$`, 'm').exec(body)?.[1] ?? embed;
        });
    const sections = ['Preconditions', 'Steps', 'Expected result'].map((heading) => [
        heading,
        embedded(note.sections.get(heading) ?? ''),
    ]);
    return createHash('sha256')
        .update(JSON.stringify({ properties, sections }))
        .digest('hex')
        .slice(0, 16);
}

/** Rewrites a note's `approved` and `approved_hash` in its frontmatter, leaving every other line alone. */
function writeApproval(note: Note, approved: boolean, hash?: string): void {
    const content = fs.readFileSync(note.file, 'utf8').replace(/\r\n/g, '\n');
    const updated = content.replace(/^---\n[\s\S]*?\n---\n/, (frontmatter) =>
        frontmatter
            .replace(/^approved_hash:.*\n/m, '')
            .replace(
                /^approved:.*\n/m,
                `approved: ${approved}\n${hash ? `approved_hash: ${hash}\n` : ''}`,
            ),
    );
    fs.writeFileSync(note.file, updated);
}

// --------------------------------------------------------- automated tests

/** Each test case's module tags and, when it is approved, its approved_hash. */
function coveredCases(notes: Map<string, Note>): Map<string, CoveredCase> {
    const cases = new Map<string, CoveredCase>();
    for (const note of notes.values()) {
        if (note.kind !== 'test-case') continue;
        cases.set(note.name, {
            modules: toList(note.properties.tags).filter((tag) => tag.startsWith('module/')),
            approvedHash: isTicked(note, 'approved')
                ? String(note.properties.approved_hash ?? '') || undefined
                : undefined,
        });
    }
    return cases;
}

/** The target of the first link in a property: `[[FR-WP-004]]` → `FR-WP-004`. */
function linkTarget(value: string | string[] | undefined): string {
    LINK.lastIndex = 0;
    return LINK.exec(String(toList(value)[0] ?? ''))?.[1] ?? '';
}

/** `Dashboard.md` as it should read: coverage computed from the notes and the tests. */
function dashboard(notes: Map<string, Note>, tests: AutomatedTest[]): string {
    const all = [...notes.values()];
    const moduleOf = (note: Note): string | undefined =>
        toList(note.properties.tags)
            .find((tag) => tag.startsWith('module/'))
            ?.slice('module/'.length);
    const cases = coveredCases(notes);
    return renderDashboard({
        modules: new Map(
            all
                .filter((note) => note.kind === 'module')
                .map((note) => [
                    note.name,
                    String(toList(note.properties.aliases)[0] ?? note.name),
                ]),
        ),
        requirements: all
            .filter((note) => note.kind === 'requirement')
            .map((note) => ({ name: note.name, module: moduleOf(note) }))
            .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true })),
        testCases: all
            .filter((note) => note.kind === 'test-case')
            .map((note) => ({
                name: note.name,
                requirement: linkTarget(note.properties.requirement),
                module: moduleOf(note),
                type: String(note.properties.type),
                state: isTicked(note, 'approved')
                    ? ('approved' as const)
                    : isTicked(note, 'rejected')
                      ? ('rejected' as const)
                      : ('draft' as const),
            })),
        tests: tests.map((test) => ({
            note: noteName(test),
            mode: test.mode,
            covers: [...test.covers].sort(),
            stale: staleCases(test, cases),
        })),
    });
}

const DASHBOARD = 'Dashboard.md';

/** A file's text with LF line endings (a checkout may have made them CRLF); undefined when absent. */
function readNormalized(file: string): string | undefined {
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : undefined;
}

/**
 * Rule 6: the note each test should have in `Automated Tests/` (name → full
 * text), and what is wrong with the tests' links to the vault.
 */
function automatedTestNotes(
    notes: Map<string, Note>,
    tests: AutomatedTest[],
): { expected: Map<string, string>; problems: string[] } {
    const problems: string[] = [];
    const cases = coveredCases(notes);
    const expected = new Map<string, string>();
    const taken = new Map<string, string>();
    for (const test of tests) {
        const title = `${test.file} "${test.titlePath.join(' › ')}"`;
        problems.push(...test.problems);
        for (const id of test.covers) {
            const testCase = cases.get(id);
            if (!testCase) {
                problems.push(`${title}: tagged @${id}, which is not a test case in the vault`);
            } else if (!test.builtFrom.has(id)) {
                problems.push(
                    `${title}: tagged @${id} but has no ${BUILT_FROM} annotation saying which ` +
                        'approved text it was built from — ' +
                        (testCase.approvedHash
                            ? `check the test against ${id}, then add ` +
                              `{ type: '${BUILT_FROM}', description: '${id}@${testCase.approvedHash}' }`
                            : `${id} is not approved yet; approve it, then annotate the test`),
                );
            }
        }
        for (const id of test.builtFrom.keys()) {
            if (!test.covers.includes(id)) {
                problems.push(
                    `${title}: has a ${BUILT_FROM} annotation for ${id} but no @${id} tag`,
                );
            }
        }
        const name = noteName(test);
        const clash = taken.get(name.toLowerCase());
        if (clash) {
            problems.push(`${title}: has the same title as ${clash}; rename one of them`);
            continue;
        }
        taken.set(name.toLowerCase(), title);
        expected.set(name, renderNote(test, cases));
    }
    return { expected, problems };
}

/** `Automated Tests/` as it is on disk: note name → text. */
function generatedNotes(vaultDir: string): Map<string, string> {
    const dir = path.join(vaultDir, NOTES_FOLDER);
    if (!fs.existsSync(dir)) return new Map();
    return new Map(
        fs
            .readdirSync(dir)
            .filter((file) => file.endsWith('.md'))
            .map((file) => [
                path.basename(file, '.md'),
                fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n'),
            ]),
    );
}

// -------------------------------------------------------------------- main

const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        help: { type: 'boolean', short: 'h', default: false },
        vault: { type: 'string', default: 'specs/product/vault' },
        tests: { type: 'string', default: 'tests/ui,tests/api' },
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

interface Vault {
    files: string[];
    notes: Map<string, Note>;
    bases: Set<string>;
}

// Obsidian resolves [[Name]] case-insensitively, so lookups do too — keyed by
// the lowercased name.
function loadVault(): Vault {
    const files = walk(vaultDir);
    return {
        files,
        notes: new Map(
            files
                .filter((file) => file.endsWith('.md'))
                .map((file) => [path.basename(file, '.md').toLowerCase(), parseNote(file)]),
        ),
        bases: new Set(
            files
                .filter((file) => file.endsWith('.base'))
                .map((file) => path.basename(file).toLowerCase()),
        ),
    };
}

/**
 * Rule 10. Only a person approves a test case, by ticking `approved`; this
 * records which text they approved, and notices when that text changes. Each
 * finding carries the problem to report and the fix to apply instead.
 */
function approvalFindings(
    notes: Map<string, Note>,
): { note: Note; problem: string; fix: () => void; revokes: boolean }[] {
    const findings: { note: Note; problem: string; fix: () => void; revokes: boolean }[] = [];
    for (const note of notes.values()) {
        if (note.kind !== 'test-case' || note.properties.approved === undefined) continue;
        const approved = isTicked(note, 'approved');
        const stored = note.properties.approved_hash;
        if (approved && stored === undefined) {
            findings.push({
                note,
                problem:
                    'approved, but the approval is not recorded yet — run `npm.cmd run vault:lint -- --fix`',
                fix: () => writeApproval(note, true, approvalHash(notes, note)),
                revokes: false,
            });
        } else if (approved && String(stored) !== approvalHash(notes, note)) {
            findings.push({
                note,
                problem:
                    'changed since it was approved, so the approval no longer holds — ' +
                    '`npm.cmd run vault:lint -- --fix` unticks it for re-approval',
                fix: () => writeApproval(note, false),
                revokes: true,
            });
        } else if (!approved && stored !== undefined) {
            findings.push({
                note,
                problem: 'is not approved but still carries an approved_hash',
                fix: () => writeApproval(note, false),
                revokes: false,
            });
        }
    }
    return findings;
}

const testDirs = values.tests
    .split(',')
    .map((dir) => dir.trim())
    .filter(Boolean);
const tests = readAutomatedTests(repoRoot, testDirs);

// --fix rewrites in dependency order — approvals first, because a test's
// `stale` list depends on them — then checks the result like any other run.
if (values.fix) {
    const findings = approvalFindings(loadVault().notes);
    findings.forEach((finding) => finding.fix());
    const recorded = findings.filter((f) => !f.revokes && isTicked(f.note, 'approved'));
    const revoked = findings.filter((f) => f.revokes);
    if (recorded.length) {
        console.log(
            `vault-lint: recorded the approval of ${recorded.map((f) => f.note.name).join(', ')}`,
        );
    }
    if (revoked.length) {
        console.log(
            'vault-lint: changed since approval, unticked approved — re-approve in Obsidian: ' +
                revoked.map((f) => f.note.name).join(', '),
        );
    }

    const { expected } = automatedTestNotes(loadVault().notes, tests);
    const actual = generatedNotes(vaultDir);
    const dir = path.join(vaultDir, NOTES_FOLDER);
    let written = 0;
    let removed = 0;
    for (const [name, text] of expected) {
        if (actual.get(name) === text) continue;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${name}.md`), text);
        written++;
    }
    for (const name of actual.keys()) {
        if (expected.has(name)) continue;
        fs.rmSync(path.join(dir, `${name}.md`));
        removed++;
    }
    if (written || removed) {
        console.log(
            `vault-lint: ${NOTES_FOLDER}/ — wrote ${written} note(s), removed ${removed} ` +
                'whose test is gone or out of scope',
        );
    }

    // Last: the dashboard counts the notes written above.
    const board = dashboard(loadVault().notes, tests);
    const boardFile = path.join(vaultDir, DASHBOARD);
    if (readNormalized(boardFile) !== board) {
        fs.writeFileSync(boardFile, board);
        console.log(`vault-lint: rewrote ${DASHBOARD}`);
    }
}

const { files, notes, bases } = loadVault();
const problems: string[] = [];

// Two files whose names differ only by case are ambiguous: `![[Test
// cases.base]]` once embedded the vault-wide `Test Cases.base` instead of the
// per-requirement query, and a case-sensitive lookup called that resolved.
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
problems.push(...[...notes.values()].flatMap((note) => lint(notes, bases, note)));

// Obsidian's property editor reads each property's type from .obsidian/types.json
// and guesses for any it does not find — a guessed "text" for a list of links
// would be saved back as one string. So every property a note uses is declared
// there, as a list type exactly when its values are lists.
const typesFile = path.join(vaultDir, '.obsidian', 'types.json');
if (fs.existsSync(typesFile)) {
    const declared =
        (JSON.parse(fs.readFileSync(typesFile, 'utf8')) as { types?: Record<string, string> })
            .types ?? {};
    const listTypes = new Set(['multitext', 'aliases', 'tags']);
    const reported = new Set<string>();
    for (const note of notes.values()) {
        for (const [key, value] of Object.entries(note.properties)) {
            const type = declared[key];
            const problem =
                type === undefined
                    ? `property ${key} is not declared in .obsidian/types.json`
                    : Array.isArray(value) !== listTypes.has(type)
                      ? `property ${key} is ${Array.isArray(value) ? 'a list' : 'a single value'} ` +
                        `here but "${type}" in .obsidian/types.json`
                      : undefined;
            if (problem && !reported.has(`${key}:${problem}`)) {
                reported.add(`${key}:${problem}`);
                problems.push(`${note.name}: ${problem}`);
            }
        }
    }
}

problems.push(
    ...approvalFindings(notes).map((finding) => `${finding.note.name}: ${finding.problem}`),
);

// Rule 6: Automated Tests/ says exactly what the code says.
const automated = automatedTestNotes(notes, tests);
problems.push(...automated.problems);

// Rule 31 (CLAUDE.md): a test of another application never covers a test case.
for (const test of readAutomatedTests(repoRoot, OUTSIDE_THE_VAULT, [])) {
    if (test.covers.length || test.builtFrom.size) {
        problems.push(
            `${test.file} "${test.titlePath.join(' › ')}": tests an application outside the ` +
                'vault (rule 31), so it may not carry @TC-… tags or built-from annotations',
        );
    }
}
const onDisk = generatedNotes(vaultDir);
const outOfDate = [
    ...[...automated.expected]
        .filter(([name, text]) => onDisk.get(name) !== text)
        .map(([name]) => name),
    ...[...onDisk.keys()].filter((name) => !automated.expected.has(name)),
];
if (outOfDate.length) {
    problems.push(
        `${NOTES_FOLDER}/: ${outOfDate.length} note(s) differ from the tests ` +
            `(${outOfDate.slice(0, 3).join(', ')}${outOfDate.length > 3 ? ', …' : ''}) — ` +
            'run `npm.cmd run vault:lint -- --fix`',
    );
}

if (readNormalized(path.join(vaultDir, DASHBOARD)) !== dashboard(notes, tests)) {
    problems.push(`${DASHBOARD}: out of date — run \`npm.cmd run vault:lint -- --fix\``);
}

// Not a failure: a stale test is a fact to act on, not an inconsistency. It is
// listed in Obsidian under Needs attention → Stale tests, and on the dashboard.
const coverage = coveredCases(notes);
const stale = tests.filter((test) => staleCases(test, coverage).length > 0);
if (stale.length) {
    console.log(
        `vault-lint: ${stale.length} test(s) were built from text that is no longer the approved ` +
            `test case — review them: ${stale.map((test) => test.titlePath.join(' › ')).join('; ')}`,
    );
}

problems.forEach((problem) => console.error(problem));
if (problems.length) {
    console.error(`vault-lint: ${problems.length} problem(s) in ${notes.size} note(s)`);
    process.exit(1);
}
console.log(`vault-lint: ${notes.size} note(s), ${tests.length} test(s), no problems`);
