/**
 * Extracts catalog entries from a single TypeScript source file using the
 * TypeScript Compiler API.
 *
 * A full ts.Program is deliberately not used: no type resolution is required,
 * and parsing files individually keeps the build fast.
 *
 * Extraction reports every exported class it finds (so build.ts can warn about
 * files that export nothing). The policy of what belongs in the catalog —
 * dropping base classes, framework hooks, non-public members — lives partly
 * here (members) and partly in build.ts (base classes).
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { parseJsDoc } from './jsdoc';
import { CATALOG_EXCLUDED_METHODS, type CatalogClass, type CatalogMethod } from './types';

/** Repo-relative POSIX path, so JSON is identical on Windows and CI. */
function toPosixRelative(filePath: string, repoRoot: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function hasModifier(node: ts.Node, flag: ts.ModifierFlags): boolean {
  return (ts.getCombinedModifierFlags(node as ts.Declaration) & flag) !== 0;
}

function deriveClassKind(
  name: string,
  extendsText: string | undefined,
  isAbstract: boolean,
): CatalogClass['kind'] {
  if (isAbstract || name.startsWith('Base')) return 'base';
  if (extendsText?.startsWith('BaseComponent') || name.endsWith('Comp')) {
    return 'component';
  }
  if (extendsText?.startsWith('BasePage')) return 'page';
  return 'other';
}

/** Collapse internal whitespace so multi-line parameter lists read on one line. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function buildSignature(
  member: ts.MethodDeclaration | ts.GetAccessorDeclaration,
  sourceFile: ts.SourceFile,
  name: string,
  returns: string,
): string {
  // A getter is used as a property, so present it as one.
  if (ts.isGetAccessorDeclaration(member)) {
    return `${name}: ${returns}`;
  }
  const params = member.parameters
    .map((param) => oneLine(param.getText(sourceFile)))
    .join(', ');
  return `${name}(${params}): ${returns}`;
}

/** A catalogued method plus the source line used only for ordering. */
interface ExtractedMethod {
  method: CatalogMethod;
  line: number;
}

function extractMember(
  member: ts.MethodDeclaration | ts.GetAccessorDeclaration,
  sourceFile: ts.SourceFile,
): ExtractedMethod | undefined {
  // Only public members: a test cannot call a private or protected method.
  if (hasModifier(member, ts.ModifierFlags.Private)) return undefined;
  if (hasModifier(member, ts.ModifierFlags.Protected)) return undefined;
  if (ts.isPrivateIdentifier(member.name)) return undefined;
  // Overload signatures and abstract methods have no body; skip them.
  if (ts.isMethodDeclaration(member) && member.body === undefined) return undefined;

  const name = member.name.getText(sourceFile);
  if (name === 'constructor') return undefined;
  if (CATALOG_EXCLUDED_METHODS.includes(name)) return undefined;

  const doc = parseJsDoc(member);
  const isAsync = hasModifier(member, ts.ModifierFlags.Async);
  const returns = member.type?.getText(sourceFile) ?? (isAsync ? 'Promise<void>' : 'void');

  return {
    method: {
      name,
      signature: buildSignature(member, sourceFile, name, returns),
      description: doc.description,
      aliases: doc.aliases,
      prerequisites: doc.prerequisites,
      observableState: doc.observableState,
      ...(doc.deprecated ? { deprecated: doc.deprecated } : {}),
    },
    line: sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile)).line,
  };
}

/**
 * Parses one file and returns a CatalogClass per exported class declaration,
 * including base classes (build.ts decides whether to keep them). Files holding
 * several exported classes yield several entries.
 */
export function extractClasses(filePath: string, repoRoot: string): CatalogClass[] {
  const text = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
  );

  const relative = toPosixRelative(filePath, repoRoot);
  const classes: CatalogClass[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement) || !statement.name) continue;
    if (!hasModifier(statement, ts.ModifierFlags.Export)) continue;

    const name = statement.name.getText(sourceFile);
    const isAbstract = hasModifier(statement, ts.ModifierFlags.Abstract);
    const extendsClause = statement.heritageClauses?.find(
      (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
    );
    const extendsText = extendsClause?.types[0]?.getText(sourceFile);

    const doc = parseJsDoc(statement);

    const collected: ExtractedMethod[] = [];
    for (const member of statement.members) {
      if (!ts.isMethodDeclaration(member) && !ts.isGetAccessorDeclaration(member)) {
        // Property declarations are excluded: locators are private by
        // convention and the getters exposing them carry the information.
        continue;
      }
      const extracted = extractMember(member, sourceFile);
      if (extracted) collected.push(extracted);
    }
    collected.sort((a, b) => a.line - b.line);
    const methods: CatalogMethod[] = collected.map((entry) => entry.method);

    classes.push({
      name,
      file: relative,
      kind: deriveClassKind(name, extendsText, isAbstract),
      description: doc.description,
      aliases: doc.aliases,
      methods,
    });
  }

  return classes;
}
