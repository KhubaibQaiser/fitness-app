// @ts-check
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

/**
 * Boundary policy helper: `from` element type → allowed dependency element types.
 * eslint-plugin-boundaries v7 entity-selector syntax.
 */
const policy = (from, allowedTypes) => ({
  from: { element: { type: from } },
  allow: allowedTypes.map((type) => ({ to: { element: { type } } })),
});

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.next/',
      '**/.expo/',
      '**/.turbo/',
      '**/coverage/',
      'packages/contracts/generated/',
      '**/*.d.ts',
    ],
  },

  // Type-aware strict linting for all TS/TSX source.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unnecessary-condition': [
        'error',
        { allowConstantLoopConditions: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },

  // Module boundary enforcement — the modular-monolith discipline (build fails on violation).
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/include': ['apps/**/*', 'packages/**/*'],
      // Pre-declared for CLAUDE.md phases P2–P4 (packages/charts, i18n,
      // app-client, app-admin, and client/admin app shells do not exist yet).
      // Remove an entry here only when its phase is explicitly descoped, not
      // when the package is simply not built yet.
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/core' },
        { type: 'contracts', pattern: 'packages/contracts' },
        { type: 'db', pattern: 'packages/db' },
        { type: 'ai', pattern: 'packages/ai' },
        { type: 'modules', pattern: 'packages/modules' },
        { type: 'i18n', pattern: 'packages/i18n' },
        { type: 'ui', pattern: 'packages/ui' },
        { type: 'charts', pattern: 'packages/charts' },
        { type: 'platform', pattern: 'packages/platform' },
        { type: 'app', pattern: 'packages/app' },
        { type: 'app-client', pattern: 'packages/app-client' },
        { type: 'app-admin', pattern: 'packages/app-admin' },
        { type: 'app-web', pattern: 'apps/web' },
        { type: 'app-web-client', pattern: 'apps/web-client' },
        { type: 'app-web-admin', pattern: 'apps/web-admin' },
        { type: 'app-api', pattern: 'apps/api' },
        { type: 'app-worker', pattern: 'apps/worker' },
        { type: 'app-mobile', pattern: 'apps/mobile' },
        { type: 'app-mobile-client', pattern: 'apps/mobile-client' },
        { type: 'app-mobile-admin', pattern: 'apps/mobile-admin' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            policy('core', ['core']),
            policy('contracts', ['contracts', 'core']),
            policy('db', ['db', 'core']),
            policy('ai', ['ai', 'core', 'contracts']),
            policy('modules', ['modules', 'core', 'db', 'contracts', 'ai']),
            policy('i18n', ['i18n']),
            policy('ui', ['ui', 'core']),
            policy('charts', ['charts', 'ui', 'core']),
            policy('platform', ['platform', 'ui', 'core']),
            policy('app', ['app', 'ui', 'charts', 'platform', 'contracts', 'core', 'i18n']),
            policy('app-client', [
              'app-client',
              'ui',
              'charts',
              'platform',
              'contracts',
              'core',
              'i18n',
            ]),
            policy('app-admin', [
              'app-admin',
              'ui',
              'charts',
              'platform',
              'contracts',
              'core',
              'i18n',
            ]),
            policy('app-web', ['app', 'ui', 'core', 'i18n', 'platform']),
            policy('app-web-client', ['app-client', 'ui', 'core', 'i18n', 'platform']),
            policy('app-web-admin', ['app-admin', 'ui', 'core', 'i18n', 'platform']),
            policy('app-mobile', ['app', 'ui', 'core', 'i18n', 'platform']),
            policy('app-mobile-client', ['app-client', 'ui', 'core', 'i18n', 'platform']),
            policy('app-mobile-admin', ['app-admin', 'ui', 'core', 'i18n', 'platform']),
            policy('app-api', ['modules', 'db', 'core', 'contracts', 'ai']),
            policy('app-worker', ['modules', 'db', 'core', 'contracts', 'ai']),
          ],
        },
      ],
    },
  },

  // Shared code must never touch browser storage directly (platform façade only).
  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Use the packages/platform storage façade.' },
        { name: 'sessionStorage', message: 'Use the packages/platform storage façade.' },
      ],
    },
  },

  // Feature-code bans: no Platform.OS, no raw fetch, no raw <div>, no hand-written mocks.
  {
    files: ['packages/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Platform'],
              message: 'Zero Platform.OS in feature code — use packages/platform façades.',
            },
            {
              name: 'msw',
              message:
                'Hand-written mocks are banned — use generated handlers from @gymos/contracts.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='fetch']",
          message: 'Raw fetch is banned in features — use the generated API client.',
        },
        {
          selector: "JSXOpeningElement[name.name='div']",
          message: 'Raw <div> is banned in packages/app — use RN primitives via @gymos/ui.',
        },
      ],
    },
  },

  // Persistence paths: Luxon only, no raw Date construction.
  {
    files: ['packages/db/**/*.ts', 'packages/modules/**/*.ts'],
    ignores: ['**/*.test.ts', '**/__tests__/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'Use Luxon (DateTime) — raw Date is banned in persistence paths.',
        },
      ],
    },
  },

  prettierConfig,
);
