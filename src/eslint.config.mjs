import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import pluginPromise from 'eslint-plugin-promise';

export default [
  { files: ['**/*.{cjs,ts,tsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    ignores: [
      'webpack.config*',
      'webgpu-ts/dist',
      'workers',
      '**/*.cjs',
      'tests',
      'target',
      'teardown.js',
      'setup.js',
      'puppeteer_environment.js',
      'jest.integration.config.js',
      'jest.config.js',
      'eslint.config.mjs',
      'cypress',
      'cypress.config.ts',
      'cypress.ci.config.ts',
      '**/*.test.ts',
      '**/*test.mjs',
      'env.dev.ts',
    ],
  },
  {
    plugins: {
      promise: pluginPromise,
    },
  },
  {
    rules: {
      'no-cond-assign': 'off',
      'no-this-alias': 'off',
      'require-atomic-updates': 2,
      'no-promise-executor-return': 2,
      'no-self-compare': 2,
      'no-throw-literal': 2,
      'valid-typeof': 2,
      'prefer-promise-reject-errors': 2,
      'no-unused-expressions': 2,
      'no-loop-func': 2,

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      'no-unused-vars': 'off',
      'promise/catch-or-return': 'error',
      'no-unused-private-class-members': 'off',
      'no-var': 'off',
      'require-await': 2,

      // Style rules
      'object-curly-spacing': [2, 'always'],
      'no-trailing-spaces': 2,
      'key-spacing': [
        'error',
        {
          afterColon: true,
        },
      ],
      'sort-keys': [
        'error',
        'asc',
        {
          caseSensitive: true,
          natural: false,
          minKeys: 2,
        },
      ],
      quotes: ['error', 'single'],
      'object-property-newline': [
        'error',
        {
          allowAllPropertiesOnSameLine: true,
        },
      ],
      'block-spacing': ['error'],
      'comma-spacing': ['error'],
      semi: ['error', 'always'],
    },
  },
];
