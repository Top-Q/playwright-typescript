/**
 * vault — reads requirements and test cases from the requirement vault
 * (specs/product/vault/), the source of truth /gen-test specs come from.
 *
 * The vault is written for Obsidian: links are `[[target|display]]`, a test
 * case can embed another note's block with `![[TC-X#^block]]`, and who runs a
 * test is the `actors` property rather than a sentence. None of that may reach
 * the test-creator, which would write a test against `![[...]]` as if it were
 * a precondition. So this module returns plain text only: links become their
 * display text, embeds become the text they point at, and each actor becomes a
 * "Logged in as …" precondition.
 *
 * Relationships point one way in the vault: a test case names its requirement,
 * and a requirement does not list its test cases. They are found here by
 * scanning, and ordered by id.
 */

import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { PipelineError, toPosix } from './run-directory';

/** One test case, as plain text. */
export interface TestCase {
    id?: string;
    type?: string;
    title?: string;
    preconditions?: string[];
    steps?: string[];
    expected_result?: string;
    /** Repo-relative path of the note it was read from. */
    file?: string;
    /**
     * Clarification questions still open that name this test case under
     * `blocks`. Its expected result is a guess until they are answered.
     */
    openQuestions?: OpenQuestion[];
}

export interface OpenQuestion {
    id: string;
    title: string;
}

/** One requirement with its test cases, as plain text. */
export interface Requirement {
    id?: string;
    module?: string;
    text?: string;
    test_cases?: TestCase[];
}

type Properties = Record<string, string | string[] | undefined>;

interface Note {
    file: string;
    properties: Properties;
    body: string;
}

const LINK = /\[\[([^\]|#\\]*)(#\^?[^\]|\\]*)?(?:\\?\|([^\]]*))?\]\]/g;

function toList(value: string | string[] | undefined): string[] {
    if (value === undefined || value === null) return [];
    return Array.isArray(value) ? value : [value];
}

function walk(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        if (entry.name.startsWith('.')) return [];
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return full.endsWith('.md') ? [full] : [];
    });
}

function readNotes(vaultDir: string): Map<string, Note> {
    const notes = new Map<string, Note>();
    for (const file of walk(vaultDir)) {
        const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
        const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(content);
        notes.set(path.basename(file, '.md'), {
            file,
            properties: (match ? (load(match[1]) ?? {}) : {}) as Properties,
            body: match ? match[2] : content,
        });
    }
    return notes;
}

function kind(note: Note): string | undefined {
    return toList(note.properties.tags)
        .find((tag) => tag.startsWith('kind/'))
        ?.slice('kind/'.length);
}

function linkTarget(value: string | string[] | undefined): string {
    LINK.lastIndex = 0;
    return LINK.exec(String(toList(value)[0] ?? ''))?.[1] ?? '';
}

/** Markdown with links reduced to their display text, as a spec wants it. */
function plain(text: string): string {
    return text
        .replace(LINK, (_, target: string, _anchor?: string, display?: string) => display ?? target)
        .replace(/\\</g, '<')
        .replace(/ \^[\w-]+$/gm, '')
        .trim();
}

/** The body under `## heading`, up to the next `## `; undefined when absent. */
function section(body: string, heading: string): string | undefined {
    const parts = body.split(/^## (.+)$/m);
    for (let index = 1; index < parts.length; index += 2) {
        if (parts[index].trim() === heading) return parts[index + 1].trim();
    }
    return undefined;
}

/** `![[TC-X#^block]]` → the text of that block; `![[Note#Heading]]` → that section. */
function expandEmbeds(text: string, notes: Map<string, Note>): string {
    return text.replace(
        /!\[\[([^\]|#]+)(#\^?[^\]|]*)?\]\]/g,
        (embed, target: string, anchor?: string) => {
            const note = notes.get(target);
            if (!note || !anchor) return embed;
            if (anchor.startsWith('#^')) {
                const block = new RegExp(`^(.*) \\^${anchor.slice(2)}$`, 'm').exec(note.body);
                return block ? block[1].replace(/^(?:- |\d+\. )/, '') : embed;
            }
            return section(note.body, anchor.slice(1)) ?? embed;
        },
    );
}

/** List items of a `- ` or `1. ` list, embeds expanded, links reduced to text. */
function items(text: string | undefined, notes: Map<string, Note>): string[] | undefined {
    if (text === undefined) return undefined;
    return expandEmbeds(text, notes)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => plain(line.replace(/^(?:- |\d+\. )/, '')));
}

function article(noun: string): string {
    return /^[aeiou]/i.test(noun) ? 'an' : 'a';
}

/** Open clarifications whose `blocks` list names the test case `id`. */
function openQuestionsBlocking(id: string, notes: Map<string, Note>): OpenQuestion[] {
    return [...notes.values()]
        .filter((note) => kind(note) === 'clarification')
        .filter((note) => String(note.properties.status ?? '').toLowerCase() === 'open')
        .filter((note) => toList(note.properties.blocks).some((value) => linkTarget(value) === id))
        .map((note) => ({
            id: String(note.properties.id),
            title: plain(String(note.properties.title ?? '')),
        }))
        .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

function readTestCase(note: Note, notes: Map<string, Note>, repoRoot: string): TestCase {
    const actors = toList(note.properties.actors).map((actor) => {
        const name = plain(String(actor));
        return `Logged in as ${article(name)} ${name}`;
    });
    const preconditions = items(section(note.body, 'Preconditions'), notes);
    const steps = items(section(note.body, 'Steps'), notes);
    const testCase: TestCase = {
        id: String(note.properties.id),
        type: String(note.properties.type),
        title: plain(String(note.properties.title ?? '')),
        expected_result: plain(expandEmbeds(section(note.body, 'Expected result') ?? '', notes)),
        file: toPosix(path.relative(repoRoot, note.file)),
    };
    if (preconditions !== undefined || actors.length) {
        testCase.preconditions = [...actors, ...(preconditions ?? [])];
    }
    if (steps !== undefined) testCase.steps = steps;
    const openQuestions = openQuestionsBlocking(testCase.id ?? '', notes);
    if (openQuestions.length) testCase.openQuestions = openQuestions;
    return testCase;
}

/** A requirement and every test case whose `requirement` property links to it. */
export function readRequirement(
    repoRoot: string,
    vault: string,
    frId: string,
): { requirement: Requirement; file: string } {
    const vaultDir = path.resolve(repoRoot, vault);
    const notes = readNotes(vaultDir);
    const note = notes.get(frId);
    if (!note || kind(note) !== 'requirement') {
        throw new PipelineError(
            `requirement not found: ${toPosix(path.relative(repoRoot, path.join(vaultDir, 'Requirements', `${frId}.md`)))}`,
        );
    }
    const testCases = [...notes.values()]
        .filter((candidate) => kind(candidate) === 'test-case')
        .filter((candidate) => linkTarget(candidate.properties.requirement) === frId)
        .map((candidate) => readTestCase(candidate, notes, repoRoot))
        .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? '', 'en', { numeric: true }));
    return {
        requirement: {
            id: frId,
            module: toList(note.properties.tags)
                .find((tag) => tag.startsWith('module/'))
                ?.slice('module/'.length),
            text: plain(section(note.body, 'Requirement') ?? ''),
            test_cases: testCases,
        },
        file: toPosix(path.relative(repoRoot, note.file)),
    };
}
