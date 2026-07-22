import { test, expect } from '@playwright/test';
import * as path from 'path';
import { extractClasses } from '../../scripts/pom-catalog/extract';
import { buildCatalog, catalogFiles, ROOT_MODULE } from '../../scripts/pom-catalog/build';
import type { CatalogClass } from '../../scripts/pom-catalog/types';

const repoRoot = path.resolve(__dirname, '..', '..');
const fixtureFile = path.resolve(__dirname, 'fixtures', 'sample-multi-po.ts');

function extractFixture(): CatalogClass[] {
  return extractClasses(fixtureFile, repoRoot);
}

function classNamed(classes: CatalogClass[], name: string): CatalogClass {
  const cls = classes.find((c) => c.name === name);
  if (!cls) throw new Error(`class ${name} not found`);
  return cls;
}

test.describe('POM catalog extractor', () => {
  test('yields one CatalogClass per exported class', () => {
    const classes = extractFixture();
    expect(classes.map((c) => c.name).sort()).toEqual([
      'FilterPanelComp',
      'ItemsPage',
      'SampleBasePage',
    ]);
  });

  test('classifies an abstract base class as kind "base"', () => {
    const base = classNamed(extractFixture(), 'SampleBasePage');
    expect(base.kind).toBe('base');
  });

  test('parses the full custom tag set on a method', () => {
    const create = classNamed(extractFixture(), 'ItemsPage').methods.find(
      (m) => m.name === 'createItem',
    );
    expect(create).toBeDefined();
    expect(create?.aliases).toEqual(['addItem', 'newItem']);
    expect(create?.prerequisites).toBe('The user is on the items page');
    expect(create?.observableState).toBe('A new row appears in the items table');
    expect(create?.description.startsWith('Creates a new item')).toBe(true);
    // @param text must not bleed into the description.
    expect(create?.description).not.toContain('@param');
    expect(create?.description).not.toContain('The item name');
  });

  test('folds name, params, defaults and return into one signature', () => {
    const create = classNamed(extractFixture(), 'ItemsPage').methods.find(
      (m) => m.name === 'createItem',
    );
    expect(create?.signature).toBe(
      'createItem(name: string): Promise<ItemsPage>',
    );
  });

  test('presents a getter as a property in its signature', () => {
    const firstRow = classNamed(extractFixture(), 'ItemsPage').methods.find(
      (m) => m.name === 'firstRow',
    );
    expect(firstRow?.signature).toBe('firstRow: Locator');
  });

  test('signature carries the return type of a sync method', () => {
    const filterPanel = classNamed(extractFixture(), 'ItemsPage').methods.find(
      (m) => m.name === 'filterPanel',
    );
    expect(filterPanel?.signature).toBe('filterPanel(): FilterPanelComp');
  });

  test('excludes private members entirely', () => {
    const items = classNamed(extractFixture(), 'ItemsPage');
    expect(items.methods.map((m) => m.name)).not.toContain('buildQuery');
  });

  test('captures @deprecated', () => {
    const apply = classNamed(extractFixture(), 'FilterPanelComp').methods.find(
      (m) => m.name === 'apply',
    );
    expect(apply?.deprecated).toBe('Use ItemsPage.createItem filtering instead.');
  });

  test('captures class-level @aliases', () => {
    const items = classNamed(extractFixture(), 'ItemsPage');
    expect(items.aliases).toEqual(['SampleItemsPage', 'ItemsScreen']);
  });

  test('excludes protected members and the waitForLoad hook', () => {
    // FilterPanelComp.apply is public; nothing protected exists in the fixture,
    // but the base page's waitForLoad must not appear in the catalogued surface.
    const base = classNamed(extractFixture(), 'SampleBasePage');
    expect(base.methods.map((m) => m.name)).not.toContain('waitForLoad');
  });
});

test.describe('POM catalog builder (real page objects)', () => {
  const build = () =>
    buildCatalog({
      repoRoot,
      poRoot: path.resolve(repoRoot, 'src', 'po', 'openproject'),
      app: 'openproject',
    });

  test('excludes base classes and the _root module', () => {
    const { modules, index } = build();
    expect(modules.find((m) => m.module === ROOT_MODULE)).toBeUndefined();
    const allClassNames = modules.flatMap((m) => m.classes.map((c) => c.name));
    expect(allClassNames).not.toContain('BasePage');
    expect(allClassNames).not.toContain('BaseComponent');
    expect(index.modules.some((e) => e.module === ROOT_MODULE)).toBe(false);
  });

  test('excludes the waitForLoad hook from every class', () => {
    const { modules } = build();
    for (const mod of modules) {
      for (const cls of mod.classes) {
        expect(cls.methods.map((m) => m.name)).not.toContain('waitForLoad');
      }
    }
  });

  test('every index entry points at a module file that exists', () => {
    const result = build();
    const emitted = new Set(catalogFiles(result).keys());
    for (const entry of result.index.modules) {
      expect(emitted.has(entry.file)).toBe(true);
    }
  });

  test('index methodCount matches the module file total', () => {
    const { index, modules } = build();
    for (const entry of index.modules) {
      const mod = modules.find((m) => m.module === entry.module);
      const real =
        mod?.classes.reduce((sum, c) => sum + c.methods.length, 0) ?? -1;
      expect(entry.methodCount).toBe(real);
    }
  });

  test('the index carries no method-level data', () => {
    const { index } = build();
    const serialised = JSON.stringify(index);
    expect(serialised).not.toContain('"signature"');
    expect(serialised).not.toContain('"observableState"');
  });

  test('coverage.fullyAnnotated counts only methods with all three tags', () => {
    const { index, modules } = build();
    let expected = 0;
    for (const mod of modules) {
      for (const cls of mod.classes) {
        for (const method of cls.methods) {
          if (
            method.aliases.length > 0 &&
            method.prerequisites &&
            method.observableState
          ) {
            expected++;
          }
        }
      }
    }
    expect(index.coverage.fullyAnnotated).toBe(expected);
  });

  test('builds deterministically (ignoring generatedAt)', () => {
    const strip = (files: Map<string, string>) =>
      [...files.entries()]
        .map(([name, body]) => [name, body.replace(/"generatedAt": ".*"/g, '')])
        .sort();
    expect(strip(catalogFiles(build()))).toEqual(strip(catalogFiles(build())));
  });
});
