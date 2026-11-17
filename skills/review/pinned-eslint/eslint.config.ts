import eslint from '@eslint/js';
import functional from 'eslint-plugin-functional';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import pluginPromise from 'eslint-plugin-promise';
import unicorn from 'eslint-plugin-unicorn';
import sonarjs from 'eslint-plugin-sonarjs';
import importX from 'eslint-plugin-import-x';
import { useEffectBan } from './useEffectBan.mjs';

export default tseslint.config(
  useEffectBan,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**', '**/build/**', '**/coverage/**',
      '**/*.d.ts',
      '**/.next/**',
      '**/out/**',
      '**/.turbo/**',
      '**/.nx/**',
    ],
  },

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import-x/extensions': ['.ts', '.tsx', '.js', '.jsx'],
      'import-x/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      },
    },
    rules: {

      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      '@typescript-eslint/no-unnecessary-condition': 'error',

      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      '@typescript-eslint/prefer-optional-chain': 'error',

      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: false,
        allowTypedFunctionExpressions: false,
        allowHigherOrderFunctions: false,
        allowDirectConstAssertionInArrowFunctions: false,
      }],

      '@typescript-eslint/no-shadow': 'error',

      '@typescript-eslint/no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true,
      }],

      '@typescript-eslint/require-await': 'error',

      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      '@typescript-eslint/no-redundant-type-constituents': 'error',

      '@typescript-eslint/no-restricted-types': ['error', {
        types: {
          Omit: 'Define the type explicitly instead.',
          Pick: 'Define the type explicitly instead.',
          Partial: 'Define the type explicitly instead.',
        },
      }],

      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
      }],

      'no-unused-vars': 'off',
      'no-shadow': 'off',
      'no-use-before-define': 'off',
      'require-await': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      functional.configs.recommended,
      functional.configs.stylistic,
    ],
    rules: {

      'functional/immutable-data': 'error',

      'functional/no-let': 'error',

      'functional/prefer-property-signatures': 'error',

      'functional/prefer-immutable-types': 'warn',

      'functional/readonly-type': ['error', 'keyword'],

      'functional/no-return-void': 'off',

      'functional/no-mixed-types': 'off',

      'functional/no-classes': 'off',

      'functional/no-expression-statements': 'off',

      'functional/functional-parameters': 'off',

      'functional/no-throw-statements': 'off',

      'functional/no-conditional-statements': 'off',

      'functional/no-loop-statements': 'off',

      'functional/no-promise-reject': 'off',

      'functional/no-try-statements': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [pluginPromise.configs['flat/recommended']],
    rules: {
      'promise/always-return': 'error',

      'promise/catch-or-return': ['error', { allowFinally: true }],

      'promise/no-multiple-resolved': 'error',

      'promise/no-return-in-finally': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      'import-x/no-cycle': ['error', {
        maxDepth: Infinity,
        ignoreExternal: true,
      }],

      'import-x/no-default-export': 'error',

      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],

      'import-x/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.tsx',
          '**/*.spec.ts',
          '**/*.spec.tsx',
          '**/*.stories.ts',
          '**/*.stories.tsx',
          '**/eslint.config.*',
          '**/vite.config.*',
          '**/jest.config.*',
          '**/webpack.config.*',
          '**/playwright.config.*',
          '**/cypress.config.*',
        ],
      }],

      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { unicorn },
    rules: {
      'unicorn/prefer-node-protocol': 'error',

      'unicorn/prefer-module': 'error',

      'unicorn/no-for-loop': 'error',

      'unicorn/no-instanceof-array': 'error',

      'unicorn/prefer-array-flat': 'error',

      'unicorn/prefer-array-flat-map': 'error',

      'unicorn/prefer-array-some': 'error',

      'unicorn/prefer-includes': 'error',

      'unicorn/prefer-string-slice': 'error',

      'unicorn/no-typeof-undefined': 'error',

      'unicorn/no-abusive-eslint-disable': 'error',

      'unicorn/error-message': 'error',

      'unicorn/consistent-function-scoping': 'error',

      'unicorn/no-useless-undefined': 'error',

      'unicorn/prefer-ternary': ['error', 'only-single-line'],

      'unicorn/no-negated-condition': 'error',

      'unicorn/throw-new-error': 'error',

      'unicorn/filename-case': ['error', {
        cases: {
          camelCase: true,
          pascalCase: true,
          kebabCase: true,
        },
        ignore: [
          /^eslint\.config\./,
          /^vite\.config\./,
          /^jest\.config\./,
          /^tsconfig.*\.json$/,
          /\.test\./,
          /\.spec\./,
          /\.stories\./,
          /\.d\.ts$/,
        ],
      }],

      'unicorn/prevent-abbreviations': ['warn', {
        replacements: {
          e: { event: true },
          err: { error: true },
          cb: { callback: true },
          fn: false,
          props: false,
          ref: false,
          ctx: false,
          req: false,
          res: false,
        },
      }],

      'unicorn/no-null': 'off',

      'unicorn/no-array-reduce': 'off',

      'unicorn/no-array-for-each': 'off',

      'unicorn/prefer-dom-node-append': 'off',
      'unicorn/prefer-query-selector': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { sonarjs },
    rules: {
      'sonarjs/no-identical-functions': ['error', 3],

      'sonarjs/cognitive-complexity': ['error', 15],

      'sonarjs/no-collapsible-if': 'error',

      'sonarjs/no-nested-template-literals': 'error',

      'sonarjs/prefer-single-boolean-return': 'error',

      'sonarjs/no-redundant-jump': 'error',

      'sonarjs/no-all-duplicated-branches': 'error',

      'sonarjs/no-element-overwrite': 'error',

      'sonarjs/no-gratuitous-expressions': 'error',
    },
  },

  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      'max-lines': ['error', {
        max: 300, skipBlankLines: true, skipComments: true,
      }],
      'max-lines-per-function': ['error', {
        max: 50, skipBlankLines: true, skipComments: true,
      }],
      'max-statements': ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      complexity: ['error', 10],
      // shortcut: core max-len is deprecated, replace before ESLint 10.
      'max-len': ['error', { code: 80 }],
    },
  },

  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {

      ...react.configs.recommended.rules,

      'react/react-in-jsx-scope': 'off',

      'react/jsx-no-duplicate-props': 'error',

      'react/no-array-index-key': 'warn',

      'react/no-unstable-nested-components': 'error',

      'react/jsx-key': ['error', {
        checkFragmentShorthand: true,
        checkKeyMustBeforeSpread: true,
      }],

      'react/self-closing-comp': ['error', {
        component: true,
        html: true,
      }],

      'react/prefer-read-only-props': 'warn',

      'react/hook-use-state': 'error',

      'react/jsx-boolean-value': ['error', 'never'],

      'react/jsx-fragments': ['error', 'syntax'],

      ...reactHooks.configs.recommended.rules,

      'react-hooks/rules-of-hooks': 'error',

      'react-hooks/exhaustive-deps': 'error',

      ...jsxA11y.configs.recommended.rules,
    },
  },

  {
    files: [
      'eslint.config.*',
      'vite.config.*',
      'jest.config.*',
      'vitest.config.*',
      'webpack.config.*',
      'rollup.config.*',
      'playwright.config.*',
      '*.config.ts',
      '*.config.js',
    ],
    rules: {
      'import-x/no-default-export': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
