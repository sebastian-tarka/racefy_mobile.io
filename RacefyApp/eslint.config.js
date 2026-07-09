// ESLint flat config (ESLint 9). Extends Expo's recommended config and
// integrates Prettier. See https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
// Disables ESLint formatting rules that would conflict with Prettier. We do NOT
// run Prettier as an ESLint rule (slow + noisy) — formatting is a separate
// `npm run format` step. ESLint focuses on correctness/code-quality only.
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      'node_modules/*',
      '.expo/*',
      'scripts/*',
      'src/mocks/*',
    ],
  },
  {
    // General rules for the whole tree. Keep the baseline pragmatic for an
    // existing codebase: surface real problems as warnings first, tighten to
    // errors once the tree is clean.
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-unresolved': 'off',
    },
  },
  {
    // TypeScript-only overrides (the @typescript-eslint plugin is registered by
    // eslint-config-expo only for these files, so the rules must be scoped too).
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Test files: provide Jest globals (describe/it/expect/jest/...).
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
]);
