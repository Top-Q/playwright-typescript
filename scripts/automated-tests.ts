/**
 * automated-tests — reads every Playwright test, and renders the vault note
 * that stands for it in `Automated Tests/`.
 *
 * The test file is the fact: what a test is called, whether it is fixme, which
 * test cases it covers (its `@TC-…` tags) and which approved text of each it
 * was built from (its `built-from` annotations). The vault note is a copy kept
 * for Obsidian — the graph, backlinks and Bases views — and vault-lint fails
 * when the copy and the code disagree; `vault:lint -- --fix` rewrites it.
 *
 * Read with the TypeScript compiler rather than a regex, so `test.describe`
 * nesting, `test.fixme` and multi-line option objects are read as the test
 * runner reads them.
 */

import * as fs from 'fs';
import * as path from 'path';
import { dump } from 'js-yaml';
import * as ts from 'typescript';

/** One `test(...)` call. */
export interface AutomatedTest {
    /** Repo-relative, forward slashes. */
    file: string;
    /** The test's title, prefixed by every enclosing `test.describe` title. */
    titlePath: string[];
    mode: 'test' | 'fixme' | 'skip';
    /** `TC-…` ids from the `@TC-…` tags, the describe blocks' included. */
    covers: string[];
    /** Test case id → the approved_hash the test was built from. */
    builtFrom: Map<string, string>;
    /** What could not be read statically, as `file:line: message`. */
    problems: string[];
}

/**
 * `{ type: 'built-from', description: 'TC-MEM-009-01@3f9a1c0e7b2d4a61' }` — the
 * approved text of a test case this test was generated or checked against.
 */
export const BUILT_FROM = 'built-from';
const BUILT_FROM_VALUE = /^(TC-[A-Z]+-\d+-\d+)@([0-9a-f]{16})$/;
const TEST_CASE_TAG = /^@(TC-[A-Z]+-\d+-\d+)$/;

/** The folder of the vault the generated notes live in. */
export const NOTES_FOLDER = 'Automated Tests';

/**
 * Test directories outside the vault's scope (rule 31): they test some other
 * application, so they get no note, count nowhere on the dashboard, and may
 * never cover a test case. `tests/ui/saucedemo` drives saucedemo.com, a demo
 * site kept in this repository for convenience.
 */
export const OUTSIDE_THE_VAULT = ['tests/ui/saucedemo'];

function specFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return specFiles(full);
        return entry.name.endsWith('.spec.ts') ? [full] : [];
    });
}

function literal(node: ts.Node | undefined): string | undefined {
    return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
        ? node.text
        : undefined;
}

/** `test`, `test.fixme`, `test.describe.serial` … → `['test', 'fixme']` etc. */
function calleePath(expression: ts.Expression): string[] | undefined {
    if (ts.isIdentifier(expression)) return [expression.text];
    if (ts.isPropertyAccessExpression(expression)) {
        const head = calleePath(expression.expression);
        return head && [...head, expression.name.text];
    }
    return undefined;
}

interface Scope {
    titles: string[];
    tags: string[];
    builtFrom: Map<string, string>;
    mode: AutomatedTest['mode'];
}

/** Reads `{ tag, annotation }` from a test's or describe's details object. */
function readDetails(
    details: ts.Expression | undefined,
    where: (node: ts.Node) => string,
    problems: string[],
): { tags: string[]; builtFrom: Map<string, string> } {
    const tags: string[] = [];
    const builtFrom = new Map<string, string>();
    if (!details || !ts.isObjectLiteralExpression(details)) return { tags, builtFrom };
    for (const property of details.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) continue;
        const value = property.initializer;
        if (property.name.text === 'tag') {
            const items = ts.isArrayLiteralExpression(value) ? [...value.elements] : [value];
            for (const item of items) {
                const text = literal(item);
                if (text === undefined)
                    problems.push(`${where(item)}: a tag that is not a string literal`);
                else tags.push(text);
            }
        }
        if (property.name.text === 'annotation') {
            const items = ts.isArrayLiteralExpression(value) ? [...value.elements] : [value];
            for (const item of items) {
                if (!ts.isObjectLiteralExpression(item)) continue;
                const field = (name: string): string | undefined =>
                    literal(
                        item.properties.find(
                            (p): p is ts.PropertyAssignment =>
                                ts.isPropertyAssignment(p) &&
                                ts.isIdentifier(p.name) &&
                                p.name.text === name,
                        )?.initializer,
                    );
                if (field('type') !== BUILT_FROM) continue;
                const match = BUILT_FROM_VALUE.exec(field('description') ?? '');
                if (!match) {
                    problems.push(
                        `${where(item)}: a ${BUILT_FROM} annotation's description must be ` +
                            '"TC-…@<approved_hash>"',
                    );
                } else {
                    builtFrom.set(match[1], match[2]);
                }
            }
        }
    }
    return { tags, builtFrom };
}

/** Every test in the spec files under `dirs`, in file and source order. */
export function readAutomatedTests(
    repoRoot: string,
    dirs: string[],
    exclude: string[] = OUTSIDE_THE_VAULT,
): AutomatedTest[] {
    const tests: AutomatedTest[] = [];
    const files = dirs.flatMap((dir) => specFiles(path.resolve(repoRoot, dir))).sort();
    for (const file of files) {
        const relative = path.relative(repoRoot, file).split(path.sep).join('/');
        if (exclude.some((dir) => relative.startsWith(`${dir.replace(/\/$/, '')}/`))) continue;
        const source = ts.createSourceFile(
            file,
            fs.readFileSync(file, 'utf8'),
            ts.ScriptTarget.Latest,
            true,
        );
        const where = (node: ts.Node): string =>
            `${relative}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

        const visit = (node: ts.Node, scope: Scope): void => {
            if (ts.isCallExpression(node)) {
                const callee = calleePath(node.expression);
                const title = literal(node.arguments[0]);
                const body = node.arguments[node.arguments.length - 1];
                const isFunction =
                    body && (ts.isArrowFunction(body) || ts.isFunctionExpression(body));
                if (callee?.[0] === 'test' && title !== undefined && isFunction) {
                    const problems: string[] = [];
                    const details = readDetails(
                        node.arguments.length === 3 ? node.arguments[1] : undefined,
                        where,
                        problems,
                    );
                    const modifiers = callee.slice(1);
                    const mode: AutomatedTest['mode'] = modifiers.includes('fixme')
                        ? 'fixme'
                        : modifiers.includes('skip')
                          ? 'skip'
                          : scope.mode;
                    const inner: Scope = {
                        titles: [...scope.titles, title],
                        tags: [...scope.tags, ...details.tags],
                        builtFrom: new Map([...scope.builtFrom, ...details.builtFrom]),
                        mode,
                    };
                    if (modifiers[0] === 'describe') {
                        ts.forEachChild(body, (child) => visit(child, inner));
                        return;
                    }
                    tests.push({
                        file: relative,
                        titlePath: inner.titles,
                        mode,
                        covers: [
                            ...new Set(
                                inner.tags.flatMap((tag) => TEST_CASE_TAG.exec(tag)?.[1] ?? []),
                            ),
                        ],
                        builtFrom: inner.builtFrom,
                        problems,
                    });
                    return;
                }
            }
            ts.forEachChild(node, (child) => visit(child, scope));
        };
        visit(source, { titles: [], tags: [], builtFrom: new Map(), mode: 'test' });
    }
    return tests;
}

/** The note's name: the title path, with what a filename or a wikilink cannot hold replaced. */
export function noteName(test: AutomatedTest): string {
    return test.titlePath
        .join(' › ')
        .replace(/[\\/:*?"<>|#^[\]]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

/** What the vault knows about one test case, for rendering a test's note. */
export interface CoveredCase {
    /** The `module/*` tags of the test case. */
    modules: string[];
    /** Its approved_hash, when it is approved. */
    approvedHash?: string;
}

/**
 * The covered test cases whose approved text is not the text the test was
 * built from — revised and re-approved since, or no longer approved at all.
 */
export function staleCases(test: AutomatedTest, cases: Map<string, CoveredCase>): string[] {
    return [...test.covers].sort().filter((id) => {
        const approved = cases.get(id)?.approvedHash;
        return approved === undefined || test.builtFrom.get(id) !== approved;
    });
}

/** The full text of the note for `test`. */
export function renderNote(test: AutomatedTest, cases: Map<string, CoveredCase>): string {
    const covers = [...test.covers].sort();
    const stale = staleCases(test, cases);
    const modules = [...new Set(covers.flatMap((id) => cases.get(id)?.modules ?? []))].sort();
    const properties = {
        title: test.titlePath.join(' › '),
        file: test.file,
        mode: test.mode,
        covers: covers.map((id) => `[[${id}]]`),
        built_from: covers.flatMap((id) => {
            const hash = test.builtFrom.get(id);
            return hash ? [`${id}@${hash}`] : [];
        }),
        stale: stale.map((id) => `[[${id}]]`),
        tags: ['kind/automated-test', ...modules],
    };
    const frontmatter = dump(properties, { lineWidth: -1, quotingType: '"' });
    return (
        `---\n${frontmatter}---\n\n` +
        `Generated from \`${test.file}\` by \`npm.cmd run vault:lint -- --fix\`. ` +
        'Change the test, not this note: the next fix rewrites it.\n'
    );
}
