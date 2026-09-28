import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/** The domain package is shared by the API and the browser: no platform APIs or frameworks. */
const PLATFORM_IMPORTS = ['node:*', 'fs', 'path', 'express', 'sequelize', 'vue', 'react', 'next'];
const PLATFORM_GLOBALS = ['window', 'document', 'localStorage', 'process'];

export default defineConfig(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.next/**',
      '**/next-env.d.ts',
      // The Next.js site keeps its own ESLint setup (eslint-config-next).
      'apps/web/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['apps/admin/**'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['apps/api/**', 'tooling/**', '**/*.config.{ts,mts,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/domain/src/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: PLATFORM_IMPORTS }],
      'no-restricted-globals': ['error', ...PLATFORM_GLOBALS],
    },
  },
  {
    rules: {
      eqeqeq: ['error', 'always'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Declaration files merge into global interfaces, which count as unused.
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
  prettier
);
