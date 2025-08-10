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
    ],
  },

  // Base JS + TS recommended
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Apply Playwright rules only to tests
  {
    ...playwright.configs['flat/recommended'],
    files: [
      'tests/**/*.{ts,tsx}', 
      '**/*.{test,spec}.{ts,tsx}', 
      'src/po/**/*.{ts,tsx}'
    ],
  },
];
