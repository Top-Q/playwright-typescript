// eslint.config.mjs
// Minimal working config for TypeScript + Playwright (ESLint v9 flat config)

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default [
  // Ignore (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // Gitignored /gen-test run artifacts. Nothing in here is project code, and
      // anything .ts-shaped that lands in a run directory is outside tsconfig's
      // project service — which fails gate:lint with a parsing error rather than
      // anything about the repository.
      '.pipeline/**',
      // Vendored Playwright trace-viewer sources used by the playwright-trace
      // skill. Not project code: they import '@isomorphic/*' path aliases that
      // this project's tsconfig does not define, so they cannot be type-checked
      // here and must not be linted as if they were ours.
      //
      // Scoped to that one skill rather than all of `.claude/`, because the
      // /gen-test pipeline's scripts live in `.claude/skills/gen-test/scripts/`
      // and are ours: they must stay under the same gates they enforce.
      '.claude/skills/playwright-trace/**',
      // Catalog test fixtures deliberately contain unused members and
      // await-less async methods to exercise the extractor; not real code.
      'tests/unit/fixtures/**',
    ],
  },

  // Base JS + TS recommended
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Plain JS/ESM config files (this file included) are not part of the
  // TypeScript program, so type-aware rules cannot run on them.
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Apply Playwright rules only to tests
  {
    ...playwright.configs['flat/recommended'],
    files: [
      'tests/**/*.{ts,tsx}',
      '**/*.{test,spec}.{ts,tsx}',
      'src/po/**/*.{ts,tsx}',
    ],
  },

  // Scripts (Node.js utilities) — no Playwright rules
  {
    files: ['scripts/**/*.{ts,tsx}'],
  },

  // Browser-less unit tests iterate over catalog data, so browser-oriented
  // rules like no-conditional-in-test do not apply.
  {
    files: ['tests/unit/**/*.{ts,tsx}'],
    rules: {
      'playwright/no-conditional-in-test': 'off',
    },
  },

  // Type-aware rules — TypeScript sources only.
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'require-await': 'error',
    },
  },
];


