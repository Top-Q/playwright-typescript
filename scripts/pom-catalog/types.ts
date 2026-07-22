/**
 * On-disk shape of the POM catalog.
 *
 * The catalog exists for one job: letting an agent discover the right page
 * object method to call when writing a test. Every field earns its place by
 * serving that job. Anything that only helps infrastructure work — line
 * numbers, visibility, abstractness, inheritance boilerplate — is deliberately
 * absent, because the agent that fills in a page object is handed the class and
 * reads the source directly.
 *
 * This file is the only definition of the catalog JSON. Bump SCHEMA_VERSION
 * whenever the shape changes so consumers can detect a mismatch.
 */

export const SCHEMA_VERSION = 2;

/** Framework hooks that are never called directly from a test. */
export const CATALOG_EXCLUDED_METHODS = ['waitForLoad'];

export interface CatalogMethod {
  /** The search/alias anchor. */
  name: string;
  /** Full callable form, e.g. "addMember(user: string, role?: string): Promise<void>". */
  signature: string;
  /** Leading JSDoc text, tags stripped. */
  description: string;
  /** @aliases — alternative names to search by. */
  aliases: string[];
  /** @prerequisites — what must be true before calling. */
  prerequisites: string;
  /** @observable-state — the effect of calling. */
  observableState: string;
  /** @deprecated reason, when present. */
  deprecated?: string;
}

export interface CatalogClass {
  name: string;
  /** Repo-relative POSIX path. */
  file: string;
  /**
   * 'base' is a valid classification but the builder excludes base classes
   * from the generated catalog — they are infrastructure, never used directly
   * in a test.
   */
  kind: 'page' | 'component' | 'base' | 'other';
  description: string;
  aliases: string[];
  methods: CatalogMethod[];
}

export interface CatalogModule {
  /** Folder name; "_root" for files directly under the app directory. */
  module: string;
  /** e.g. "members.json" */
  file: string;
  app: string;
  generatedAt: string;
  schemaVersion: number;
  classes: CatalogClass[];
}

/**
 * Class-level only — never method-level.
 *
 * This is the progressive-disclosure tier: the index must stay small enough to
 * fit in a prompt even when the project has thousands of methods, so consumers
 * read the index first and then fetch only the module files they need.
 */
export interface CatalogIndexClassRef {
  name: string;
  kind: CatalogClass['kind'];
  file: string;
  aliases: string[];
  methodCount: number;
}

export interface CatalogIndexEntry {
  module: string;
  file: string;
  classCount: number;
  methodCount: number;
  classes: CatalogIndexClassRef[];
}

/** Metadata completeness across all catalogued methods. */
export interface CatalogCoverage {
  methods: number;
  withDescription: number;
  withAliases: number;
  withPrerequisites: number;
  withObservableState: number;
  /** All three custom tags non-empty. */
  fullyAnnotated: number;
}

export interface CatalogIndex {
  app: string;
  /** e.g. "src/po/openproject" */
  poRoot: string;
  generatedAt: string;
  schemaVersion: number;
  totals: { modules: number; classes: number; methods: number };
  coverage: CatalogCoverage;
  modules: CatalogIndexEntry[];
}
