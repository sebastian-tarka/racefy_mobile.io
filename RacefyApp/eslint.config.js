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
      // i18next's default export is the i18n instance, so `i18n.t()` / `i18n.changeLanguage()`
      // are exactly how it is meant to be used — the rule only produces noise here.
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    // Theme-system rules — scoped to app source; scripts and config files don't
    // consume the theme.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      // A literal font size bypasses the system-font-scale cap baked into the
      // `fontSize` tokens (see src/theme/scale.ts), so it will overflow its
      // container once the user enlarges text. The tree is clean, hence 'error'.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9.]+$/]",
          message:
            'Use a fontSize token from the theme (fontSize.md, …) or msFont(n) — a raw number skips the fontScale cap.',
        },
        {
          // The accent colours a seasonal (server-delivered) palette may change.
          // A literal copy stays emerald while the rest of the app turns red —
          // use colors.primary / error / warning / info / success / textMuted /
          // textSecondary / routeAccent / rank.*, and withAlpha() for rgba.
          // White / black / overlays on photos and video are NOT banned: they
          // are white on a picture in every theme.
          selector: `Literal[value=/^(#(10b981|059669|34d399|6ee7b7|a7f3d0|d1fae5|ecfdf5|ef4444|f87171|dc2626|f59e0b|fbbf24|d97706|b45309|3b82f6|60a5fa|2563eb|1d4ed8|22c55e|16a34a|9ca3af|6b7280|db2777|ec4899|6b21a8|a855f7)|rgba\\(16, ?185, ?129,.*)$/i]`,
          message:
            'Theme accent as a literal — use the colors token (colors.primary, colors.error, …) or withAlpha(colors.x, a).',
        },
      ],
      // Metro does not tree-shake: the 'date-fns' barrel pulls in every function and
      // 'date-fns/locale' every one of ~95 locales (~1 MB of JS). Import the subpath.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'date-fns', message: "Import the function's subpath: 'date-fns/format'." },
            { name: 'date-fns/locale', message: "Import one locale: 'date-fns/locale/pl'." },
          ],
        },
      ],
    },
  },
  {
    // Palettes that are deliberately NOT themed, so the accent-literal ban does
    // not apply. Each entry is a decision, not an oversight:
    files: [
      'src/theme/**', // the tokens themselves
      '**/__tests__/**', // fixtures
      'src/utils/sportColor.ts', // one stable colour per sport, charts depend on it
      'src/screens/main/home/components/PrimaryCTA.tsx', // weather gradients
      'src/components/brandLogoFallbacks.ts', // third-party brand colours
      'src/components/Mapbox*.tsx', // map layer paint, matches the map style not the app
      'src/components/LeafletMap.tsx',
      'src/hooks/useNotifications.ts', // Android notification channel LED/accent
      'src/services/pushNotifications.ts',
      'src/services/backgroundLocation.ts',
      'src/services/**/*Notification.ts',
      'src/screens/feedback/feedbackColors.ts', // status palettes (follow-up: tokens)
      'src/screens/insights/reportStatusColors.ts',
      'src/utils/tipCategory.ts',
      'src/utils/effortAnalysis.ts',
      'src/utils/activityVerdict.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9.]+$/]",
          message:
            'Use a fontSize token from the theme (fontSize.md, …) or msFont(n) — a raw number skips the fontScale cap.',
        },
      ],
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
    rules: {
      // jest.isolateModules / per-test module state needs require() inside the test body.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
