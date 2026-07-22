/**
 * Walks the page-object tree, groups classes by module, and assembles the
 * catalog index plus one file per module.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractClasses } from './extract';
import {
  SCHEMA_VERSION,
  type CatalogClass,
  type CatalogCoverage,
  type CatalogIndex,
  type CatalogIndexEntry,
  type CatalogModule,
} from './types';

export const ROOT_MODULE = '_root';

export interface BuildOptions {
  repoRoot: string;
  /** Absolute path to the app's PO directory, e.g. <repo>/src/po/openproject. */
  poRoot: string;
  app: string;
  /** Emitted for files that produce no exported classes. */
  onWarning?: (message: string) => void;
}

export interface BuildResult {
  index: CatalogIndex;
  modules: CatalogModule[];
}

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (entry.name.endsWith('.spec.ts')) continue;
    if (entry.name === 'index.ts') continue;
    out.push(full);
  }
  return out;
}

/** First path segment below the app directory, or ROOT_MODULE for loose files. */
function moduleNameFor(filePath: string, poRoot: string): string {
  const segments = path.relative(poRoot, filePath).split(path.sep);
  return segments.length > 1 ? segments[0] : ROOT_MODULE;
}

function computeCoverage(classes: CatalogClass[]): CatalogCoverage {
  const coverage: CatalogCoverage = {
    methods: 0,
    withDescription: 0,
    withAliases: 0,
    withPrerequisites: 0,
    withObservableState: 0,
    fullyAnnotated: 0,
  };
  for (const cls of classes) {
    for (const method of cls.methods) {
      coverage.methods++;
      if (method.description) coverage.withDescription++;
      if (method.aliases.length > 0) coverage.withAliases++;
      if (method.prerequisites) coverage.withPrerequisites++;
      if (method.observableState) coverage.withObservableState++;
      if (
        method.aliases.length > 0 &&
        method.prerequisites &&
        method.observableState
      ) {
        coverage.fullyAnnotated++;
      }
    }
  }
  return coverage;
}

export function buildCatalog(options: BuildOptions): BuildResult {
  const { repoRoot, poRoot, app, onWarning } = options;

  if (!fs.existsSync(poRoot) || !fs.statSync(poRoot).isDirectory()) {
    throw new Error(`Page object root not found: ${poRoot}`);
  }

  const generatedAt = new Date().toISOString();
  const byModule = new Map<string, CatalogClass[]>();

  for (const file of collectSourceFiles(poRoot)) {
    const classes = extractClasses(file, repoRoot);
    if (classes.length === 0) {
      onWarning?.(
        `no exported classes in ${path.relative(repoRoot, file).split(path.sep).join('/')}`,
      );
      continue;
    }
    // Base classes are infrastructure, never used directly in a test, so they
    // are excluded from the catalog. A file holding only base classes (the base
    // page/component) contributes nothing and its module (_root) never forms.
    const catalogued = classes.filter((cls) => cls.kind !== 'base');
    if (catalogued.length === 0) continue;
    const moduleName = moduleNameFor(file, poRoot);
    const bucket = byModule.get(moduleName) ?? [];
    bucket.push(...catalogued);
    byModule.set(moduleName, bucket);
  }

  // Deterministic ordering: modules by name, classes by name, methods by line
  // (sorted during extraction). Re-running produces byte-identical output.
  const moduleNames = [...byModule.keys()].sort();

  const modules: CatalogModule[] = moduleNames.map((moduleName) => {
    const classes = [...(byModule.get(moduleName) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return {
      module: moduleName,
      file: `${moduleName}.json`,
      app,
      generatedAt,
      schemaVersion: SCHEMA_VERSION,
      classes,
    };
  });

  const entries: CatalogIndexEntry[] = modules.map((mod) => ({
    module: mod.module,
    file: mod.file,
    classCount: mod.classes.length,
    methodCount: mod.classes.reduce((sum, cls) => sum + cls.methods.length, 0),
    // Class-level only — the index must never carry method-level data.
    classes: mod.classes.map((cls) => ({
      name: cls.name,
      kind: cls.kind,
      file: cls.file,
      aliases: cls.aliases,
      methodCount: cls.methods.length,
    })),
  }));

  const allClasses = modules.flatMap((mod) => mod.classes);

  const index: CatalogIndex = {
    app,
    poRoot: path.relative(repoRoot, poRoot).split(path.sep).join('/'),
    generatedAt,
    schemaVersion: SCHEMA_VERSION,
    totals: {
      modules: modules.length,
      classes: allClasses.length,
      methods: entries.reduce((sum, entry) => sum + entry.methodCount, 0),
    },
    coverage: computeCoverage(allClasses),
    modules: entries,
  };

  return { index, modules };
}

/** Serialised exactly as written to disk, so --check can compare strings. */
export function serialise(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function catalogFiles(result: BuildResult): Map<string, string> {
  const files = new Map<string, string>();
  files.set('index.json', serialise(result.index));
  for (const mod of result.modules) {
    files.set(mod.file, serialise(mod));
  }
  return files;
}

/**
 * Writes the catalog, removing stale *.json first so a renamed or deleted
 * module leaves no orphan behind.
 */
export function writeCatalog(result: BuildResult, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });
  for (const existing of fs.readdirSync(outDir)) {
    if (existing.endsWith('.json')) {
      fs.rmSync(path.join(outDir, existing));
    }
  }
  for (const [name, contents] of catalogFiles(result)) {
    fs.writeFileSync(path.join(outDir, name), contents, 'utf8');
  }
}

/**
 * Compares the built catalog against what is on disk.
 * `generatedAt` is ignored: it changes on every run and would make --check
 * fail on an otherwise identical catalog.
 */
export function diffCatalog(result: BuildResult, outDir: string): string[] {
  const differences: string[] = [];
  const expected = catalogFiles(result);

  // Normalise line endings before comparing: a checkout under
  // core.autocrlf=true rewrites the committed LF catalog to CRLF on disk, and
  // the check must not fail just because of that. generatedAt is ignored too —
  // it changes every run.
  const normalise = (text: string): string =>
    text.replace(/\r\n/g, '\n').replace(/^\s*"generatedAt": ".*",$/gm, '');

  for (const [name, contents] of expected) {
    const target = path.join(outDir, name);
    if (!fs.existsSync(target)) {
      differences.push(`${name} (missing)`);
      continue;
    }
    const actual = fs.readFileSync(target, 'utf8');
    if (normalise(actual) !== normalise(contents)) {
      differences.push(`${name} (out of date)`);
    }
  }

  if (fs.existsSync(outDir)) {
    for (const existing of fs.readdirSync(outDir)) {
      if (existing.endsWith('.json') && !expected.has(existing)) {
        differences.push(`${existing} (stale, no longer generated)`);
      }
    }
  }

  return differences;
}
