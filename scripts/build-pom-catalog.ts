#!/usr/bin/env node
/**
 * build-pom-catalog — generates the POM catalog from the page object sources.
 *
 * Discovers every page object / component under src/po/<app>, parses metadata
 * out of JSDoc tags, and emits one index.json plus a file per module.
 *
 * The index carries class-level entries only, so consumers can read it whole
 * and then fetch just the module files they need.
 *
 * Zero runtime dependencies beyond `typescript` and Node builtins.
 */

import { parseArgs } from 'node:util';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildCatalog,
  diffCatalog,
  writeCatalog,
  type BuildResult,
} from './pom-catalog/build';

const HELP = `
Usage: build-pom-catalog [options]

Builds the page object catalog consumed by the test-generation pipeline.

Options:
  -h, --help            Show this help message
      --app <name>      App under the PO base to build (default: openproject)
      --po-base <dir>   PO base directory (default: src/po)
  -o, --out <dir>       Output root (default: pom-catalog)
      --check           Do not write; exit 1 if the committed catalog is stale
      --report          Print the metadata coverage table and exit
      --quiet           Suppress the per-module summary

Examples:
  build-pom-catalog
  build-pom-catalog --check
  build-pom-catalog --report
  build-pom-catalog --app openproject --out pom-catalog
`;

function fail(message: string): never {
  console.error(`build-pom-catalog: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    app: { type: 'string', default: 'openproject' },
    'po-base': { type: 'string', default: 'src/po' },
    out: { type: 'string', short: 'o', default: 'pom-catalog' },
    check: { type: 'boolean', default: false },
    report: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
});

if (values.help) {
  console.log(HELP.trim());
  process.exit(0);
}

const repoRoot = process.cwd();
const app = values.app;
const poRoot = path.resolve(repoRoot, values['po-base'], app);
const outDir = path.resolve(repoRoot, values.out, app);

if (!fs.existsSync(poRoot)) {
  fail(`page object root not found: ${path.relative(repoRoot, poRoot)}`);
}

let result: BuildResult;
try {
  result = buildCatalog({
    repoRoot,
    poRoot,
    app,
    onWarning: (message) => {
      if (!values.quiet) console.warn(`  warning: ${message}`);
    },
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const { totals, coverage } = result.index;

function printCoverage(): void {
  const pct = (n: number): string =>
    coverage.methods === 0 ? '  n/a' : `${((100 * n) / coverage.methods).toFixed(1)}%`;
  console.log(`\nMetadata coverage (${coverage.methods} methods)`);
  console.log(`  description       ${String(coverage.withDescription).padStart(4)}  ${pct(coverage.withDescription)}`);
  console.log(`  @aliases          ${String(coverage.withAliases).padStart(4)}  ${pct(coverage.withAliases)}`);
  console.log(`  @prerequisites    ${String(coverage.withPrerequisites).padStart(4)}  ${pct(coverage.withPrerequisites)}`);
  console.log(`  @observable-state ${String(coverage.withObservableState).padStart(4)}  ${pct(coverage.withObservableState)}`);
  console.log(`  fully annotated   ${String(coverage.fullyAnnotated).padStart(4)}  ${pct(coverage.fullyAnnotated)}`);

  console.log('\nPer module');
  for (const entry of result.index.modules) {
    const classes = result.modules.find((m) => m.module === entry.module)?.classes ?? [];
    let counted = 0;
    let annotated = 0;
    for (const cls of classes) {
      for (const method of cls.methods) {
        counted++;
        if (method.aliases.length > 0 && method.prerequisites && method.observableState) {
          annotated++;
        }
      }
    }
    const ratio = counted === 0 ? '  n/a' : `${((100 * annotated) / counted).toFixed(0)}%`;
    console.log(
      `  ${entry.module.padEnd(14)} ${String(annotated).padStart(3)}/${String(counted).padEnd(3)} ${ratio.padStart(5)}`,
    );
  }
}

if (values.report) {
  printCoverage();
  process.exit(0);
}

if (values.check) {
  const differences = diffCatalog(result, outDir);
  if (differences.length > 0) {
    console.error(
      `build-pom-catalog: committed catalog is out of date (${differences.length} file(s)):`,
    );
    for (const difference of differences) console.error(`  - ${difference}`);
    console.error('\nRun `npm run catalog` and commit the result.');
    process.exit(1);
  }
  if (!values.quiet) console.log(`${app}: catalog is up to date`);
  process.exit(0);
}

writeCatalog(result, outDir);

if (!values.quiet) {
  const outRelative = path.relative(repoRoot, outDir).split(path.sep).join('/');
  console.log(
    `${app}: ${totals.modules} modules, ${totals.classes} classes, ${totals.methods} methods -> ${outRelative}`,
  );
  const pct =
    coverage.methods === 0
      ? 'n/a'
      : `${((100 * coverage.fullyAnnotated) / coverage.methods).toFixed(1)}%`;
  console.log(
    `metadata coverage: ${coverage.fullyAnnotated}/${coverage.methods} fully annotated (${pct})`,
  );
}
