import js from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'apps/',
      'playwright-report/',
      'test-results/',
      '.auth/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/max-expects': ['error', { max: 1 }],
      'playwright/no-wait-for-timeout': 'error',
    },
  },
  {
    files: ['pages/**/*.ts', 'fixtures/**/*.ts', 'utils/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='expect']",
          message: 'expect belongs in specs only; use waitFor() here.',
        },
      ],
    },
  },
);
