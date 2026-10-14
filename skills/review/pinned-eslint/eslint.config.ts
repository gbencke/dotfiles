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

export default tseslint.config(
  // ── 1. Global ignores ─────────────────────────────────────────────────────
  // Exclude generated files, build output, and cache directories from linting.
  // Prevents false positives from .d.ts files and speeds up CI runs.
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/.next/**',
      '**/out/**',
      '**/.turbo/**',
      '**/.nx/**',
    ],
  },

  // ── 2. Core TypeScript rules ───────────────────────────────────────────────
  // Switches from eslint.configs.all (every rule enabled) to eslint.configs.recommended
  // (curated bug-catching rules). This avoids conflicts with @typescript-eslint
  // replacements (no-unused-vars, no-shadow, etc.) and rules that don't apply
  // to TypeScript code (init-declarations, no-ternary, max-classes-per-file).
  //
  // strictTypeChecked is the highest-value TypeScript linting tier — it requires
  // the TypeScript language service and catches: unhandled Promises, any propagation,
  // template literal misuse, and discriminated union exhaustiveness.
  //
  // stylisticTypeChecked adds consistent style rules that also need type info:
  // consistent array type syntax, consistent assertions, prefer-function-type.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true, // Modern project service API (faster than project: './tsconfig.json')
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
      // Teach import-x which file extensions to consider when resolving
      // imports without explicit extensions (e.g. './util' → './util.ts').
      // The node resolver is built-in; no additional package is required.
      'import-x/extensions': ['.ts', '.tsx', '.js', '.jsx'],
      'import-x/resolver': {
        node: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
      },
    },
    rules: {
      // ── TypeScript additions beyond strictTypeChecked ──────────────────────

      // Enforce import type for type-only imports. Works with verbatimModuleSyntax.
      // prefer-inline: import { type User, UserService } from './module'
      // rather than separate import type { User } and import { UserService } lines.
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],

      // Catch conditions that are always true or always false based on TypeScript types.
      // Eliminates dead code and logic errors where types prove the condition unconditional.
      '@typescript-eslint/no-unnecessary-condition': 'error',

      // Prefer ?? over || for null/undefined coalescing.
      // || treats 0, '', false as falsy; ?? only coalesces null and undefined.
      // Prevents: const port = config.port || 3000 (port 0 silently becomes 3000).
      '@typescript-eslint/prefer-nullish-coalescing': 'error',

      // Prefer optional chaining over manual null-check chains.
      // user && user.profile && user.profile.avatar → user?.profile?.avatar
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Require explicit return types on exported functions.
      // allowExpressions/allowTypedFunctionExpressions/allowHigherOrderFunctions
      // keep simple inline arrow functions clean while enforcing API contracts.
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],

      // Prevent variable shadowing — a source of confusion in nested closures.
      '@typescript-eslint/no-shadow': 'error',

      // Prevent variables from being used before declaration.
      // functions: false allows function hoisting (common and intentional).
      '@typescript-eslint/no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true,
      }],

      // Async functions that never await anything should not be marked async.
      // A sync function wrapped in async adds unnecessary Promise wrapping.
      '@typescript-eslint/require-await': 'error',

      // Require explicit return await inside try-catch so the awaited Promise's
      // errors are caught by the catch block rather than propagating to the caller.
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],

      // Remove redundant type constituents (string | string → string).
      // Usually indicates a copy-paste error or incomplete type refactoring.
      '@typescript-eslint/no-redundant-type-constituents': 'error',

      // Allow numbers and booleans in template literal expressions.
      // ${count}, ${isValid}, ${price} are idiomatic and readable.
      // The default only allows strings, which is too restrictive in practice.
      '@typescript-eslint/restrict-template-expressions': ['error', {
        allowNumber: true,
        allowBoolean: true,
      }],

      // ── Core ESLint rules replaced by TypeScript-aware equivalents ─────────

      // off: replaced by @typescript-eslint/no-unused-vars (in strictTypeChecked)
      'no-unused-vars': 'off',
      // off: replaced by @typescript-eslint/no-shadow above
      'no-shadow': 'off',
      // off: replaced by @typescript-eslint/no-use-before-define above
      'no-use-before-define': 'off',
      // off: replaced by @typescript-eslint/require-await above
      'require-await': 'off',
      // off: TypeScript handles duplicate declarations at the compiler level
      'no-redeclare': 'off',
      // off: TypeScript handles undefined variables in strict mode
      'no-undef': 'off',
    },
  },

  // ── 3. Functional programming discipline ──────────────────────────────────
  // FP-preferred (not FP-only) stance: immutability rules are errors;
  // paradigm-restriction rules are relaxed for React and framework integration.
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [
      functional.configs.recommended,
      functional.configs.stylistic,
    ],
    rules: {
      // ── Keep as error: high-value immutability rules ───────────────────────

      // Disables all object/array mutation: obj.prop = value, arr.push(), delete obj.prop.
      // Highest-value FP rule — eliminates aliasing bugs at the source.
      'functional/immutable-data': 'error',

      // Disables let declarations. Every variable should be const unless
      // there is an explicit, justified need to reassign it.
      'functional/no-let': 'error',

      // Enforces property signatures (readonly by default) over method signatures.
      // interface Repo { readonly findById: (id: string) => User }  ← correct
      // interface Repo { findById(id: string): User }               ← flagged
      'functional/prefer-property-signatures': 'error',

      // ── Keep as warn: aspirational immutability ────────────────────────────

      // Encourages readonly on function parameters and return types.
      // warn (not error): library types are often not readonly, producing
      // false positives when integrating with third-party code.
      'functional/prefer-immutable-types': 'warn',

      // off: enforce the `readonly` keyword form (`readonly T`) over the
      // generic form (`Readonly<T>`). The keyword form is more idiomatic in
      // modern TypeScript and is what strict-mode interfaces naturally use.
      'functional/readonly-type': ['error', 'keyword'],

      // off: void-returning functions are legitimate for side-effect runners,
      // event handlers, and React component callbacks. Pure FP idealism that
      // every function must return a value is too restrictive for real code.
      'functional/no-return-void': 'off',

      // off: React prop interfaces routinely mix data props (string, number)
      // with callback props ((event) => void). Banning this mix would require
      // splitting every React props interface into two, which is impractical.
      'functional/no-mixed-types': 'off',

      // ── Off: pragmatic relaxations for React + real-world TypeScript ───────

      // off: classes needed for React error boundaries, NestJS controllers,
      // TypeORM entities, Angular services, and DDD aggregates.
      'functional/no-classes': 'off',

      // off: JSX rendering produces expression statements. React's useEffect,
      // useState setters, and all I/O operations are expression statements.
      'functional/no-expression-statements': 'off',

      // off: zero-argument functions (() => value) and rest parameters (...args)
      // are common and legitimate in TypeScript.
      'functional/functional-parameters': 'off',

      // off: throwing is accepted in React error boundaries and at system
      // boundaries (HTTP handlers, CLI entry points, validation errors).
      'functional/no-throw-statements': 'off',

      // off: if/switch statements are necessary in many patterns. Exhaustiveness
      // checking from switch-exhaustiveness-check provides better value.
      'functional/no-conditional-statements': 'off',

      // off: for-of loops are idiomatic TypeScript. unicorn/no-for-loop handles
      // the specific case of indexed for loops that should be for-of.
      'functional/no-loop-statements': 'off',

      // off: Promise.reject is a valid error propagation mechanism.
      // promise/catch-or-return ensures these rejections are handled.
      'functional/no-promise-reject': 'off',

      // off: try-catch is necessary at system boundaries (database access,
      // external API calls, file I/O) where errors come from third-party code.
      'functional/no-try-statements': 'off',
    },
  },

  // ── 4. Promise safety ─────────────────────────────────────────────────────
  // Complements @typescript-eslint's Promise rules. eslint-plugin-promise catches
  // Promise API misuse that doesn't require type information (constructor patterns,
  // chain structure, return discipline).
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [pluginPromise.configs['flat/recommended']],
    rules: {
      // Callbacks in .then() must always return — ensures predictable chaining.
      'promise/always-return': 'error',

      // All Promises must be caught or returned so the caller can catch them.
      // allowFinally: true permits .finally() without .catch() when combined with return.
      'promise/catch-or-return': ['error', { allowFinally: true }],

      // Prevent calling resolve() or reject() more than once in a Promise constructor.
      // The second call is silently discarded, masking bugs.
      'promise/no-multiple-resolved': 'error',

      // Prevent returning values from .finally() — the return is ignored.
      'promise/no-return-in-finally': 'error',
    },
  },

  // ── 5. Module discipline ──────────────────────────────────────────────────
  // Architectural enforcement: circular dependency prevention, named export
  // preference, and import consistency. eslint-plugin-import-x is the modern,
  // actively-maintained fork of eslint-plugin-import with full flat config support.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      'import-x': importX,
    },
    rules: {
      // Detect circular dependencies. maxDepth: Infinity catches transitive cycles
      // (A → B → C → A), not just direct ones. ignoreExternal skips node_modules.
      'import-x/no-cycle': ['error', {
        maxDepth: Infinity,
        ignoreExternal: true,
      }],

      // Enforce named exports over default exports.
      // Named exports are searchable, renameable, and consistently referenced.
      // Default exports allow any name at the import site — poor for tooling.
      // Exceptions handled in the config-files override block below.
      'import-x/no-default-export': 'error',

      // Prevent importing the same module twice with different symbols.
      // prefer-inline enforces all symbols from one module in a single import.
      'import-x/no-duplicates': ['error', { 'prefer-inline': true }],

      // Prevent importing devDependencies in production code.
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

      // Enforce inline type specifiers: import { type User, UserService } from './module'
      // Works in concert with @typescript-eslint/consistent-type-imports.
      'import-x/consistent-type-specifier-style': ['error', 'prefer-inline'],
    },
  },

  // ── 6. Code quality: Unicorn ──────────────────────────────────────────────
  // Modernization and quality rules. Full recommended preset is too aggressive;
  // we enable the high-value rules and disable those conflicting with React/FP.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { unicorn },
    rules: {
      // Use node: protocol prefix for built-in Node.js modules.
      // Unambiguous, future-proof: import fs from 'node:fs'
      'unicorn/prefer-node-protocol': 'error',

      // Prefer ESM (import/export) over CommonJS (require/module.exports).
      'unicorn/prefer-module': 'error',

      // Replace indexed for loops with for-of.
      // Eliminates off-by-one errors and loop variable misuse.
      'unicorn/no-for-loop': 'error',

      // Use Array.isArray() instead of instanceof Array.
      // instanceof fails for arrays from different realms (iframes, VMs).
      'unicorn/no-instanceof-array': 'error',

      // Use Array.prototype.flat() — cleaner than [].concat(...arrays).
      'unicorn/prefer-array-flat': 'error',

      // Use Array.prototype.flatMap() — single pass vs. map().flat().
      'unicorn/prefer-array-flat-map': 'error',

      // Use Array.prototype.some() instead of find() !== undefined.
      'unicorn/prefer-array-some': 'error',

      // Use String.prototype.includes() over indexOf() comparisons.
      'unicorn/prefer-includes': 'error',

      // Use String.prototype.slice() over substring()/substr() — consistent behavior.
      'unicorn/prefer-string-slice': 'error',

      // Use === undefined instead of typeof x === 'undefined'.
      'unicorn/no-typeof-undefined': 'error',

      // Prevent bare eslint-disable without specifying which rule to disable.
      // Forces targeted, documented suppressions.
      'unicorn/no-abusive-eslint-disable': 'error',

      // Error constructors must receive a message argument.
      // throw new Error() → throw new Error('Descriptive message')
      'unicorn/error-message': 'error',

      // Move functions to the outermost scope where they don't need closure.
      // Prevents unnecessary re-creation of functions on every call.
      'unicorn/consistent-function-scoping': 'error',

      // Remove useless undefined arguments passed to functions.
      'unicorn/no-useless-undefined': 'error',

      // Prefer ternary for simple single-line if/else.
      // onlySingleLine: only enforce when both branches fit on one line.
      'unicorn/prefer-ternary': ['error', 'only-single-line'],

      // Prefer positive conditions over negated ones for readability.
      'unicorn/no-negated-condition': 'error',

      // Ensure thrown errors use the throw keyword, not return.
      'unicorn/throw-new-error': 'error',

      // Enforce consistent file naming: camelCase for hooks/utils/services,
      // PascalCase for components/classes, kebabCase for config files.
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

      // Encourage readable names over abbreviations (gradual adoption via warn).
      'unicorn/prevent-abbreviations': ['warn', {
        replacements: {
          e: { event: true },
          err: { error: true },
          cb: { callback: true },
          fn: false,    // acceptable in FP contexts
          props: false, // React convention
          ref: false,   // React ref convention
          ctx: false,   // widely understood abbreviation
          req: false,   // HTTP request — widely understood
          res: false,   // HTTP response — widely understood
        },
      }],

      // ── Off: conflicts with React or deliberate FP style ───────────────────

      // off: React components return null; React.createPortal and many third-party
      // libraries also return null. This rule conflicts with core React patterns.
      'unicorn/no-null': 'off',

      // off: FP teams use reduce deliberately for aggregations and groupBy patterns.
      // See the functional programming section for appropriate reduce usage.
      'unicorn/no-array-reduce': 'off',

      // off: forEach is acceptable for side-effect chains on arrays.
      'unicorn/no-array-for-each': 'off',

      // off: React manages the DOM — these rules don't apply to React codebases.
      'unicorn/prefer-dom-node-append': 'off',
      'unicorn/prefer-query-selector': 'off',
    },
  },

  // ── 7. Code quality: SonarJS ──────────────────────────────────────────────
  // SonarQube-style rules for cognitive complexity, duplicate code detection,
  // and code smell identification. sonarjs v3+ focuses on unique value-adds,
  // removing rules that duplicate @typescript-eslint and unicorn.
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { sonarjs },
    rules: {
      // Detect functions with identical bodies (3+ lines). Catches copy-paste programming.
      'sonarjs/no-identical-functions': ['error', 3],

      // Cognitive complexity limit per function. Functions above 15 need decomposition.
      // Cognitive complexity measures how hard the control flow is to understand,
      // applying extra weight to nesting depth beyond simple path counting.
      'sonarjs/cognitive-complexity': ['error', 15],

      // Detect nested if statements that should be merged with &&.
      'sonarjs/no-collapsible-if': 'error',

      // Prevent nested template literals that become hard to parse visually.
      'sonarjs/no-nested-template-literals': 'error',

      // Return boolean expressions directly: return condition; not if (c) return true; return false;
      'sonarjs/prefer-single-boolean-return': 'error',

      // Remove unnecessary return/break/continue that don't change control flow.
      'sonarjs/no-redundant-jump': 'error',

      // Detect switch/if where all branches execute identical code.
      'sonarjs/no-all-duplicated-branches': 'error',

      // Detect collection elements overwritten without being used first.
      'sonarjs/no-element-overwrite': 'error',

      // Detect conditions that always evaluate to the same value.
      'sonarjs/no-gratuitous-expressions': 'error',
    },
  },

  // ── 7b. Size and shape limits (strict) ────────────────────────────────────
  // Strictest of the ESLint and SonarJS defaults per rule. Lines count code only
  // (blank and comment lines skipped, as Sonar does) so comments are never punished.
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    rules: {
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-statements': ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'max-nested-callbacks': ['error', 3],
      complexity: ['error', 10],
    },
  },

  // ── 8. React: Components, Hooks, Accessibility ────────────────────────────
  // React rules are scoped to .tsx and .jsx only — applying them to pure .ts
  // files produces false positives and confusing errors in non-component code.
  {
    files: ['**/*.tsx', '**/*.jsx'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // ── React core rules ───────────────────────────────────────────────────

      ...react.configs.recommended.rules,

      // off: not needed since React 17 (automatic JSX transform)
      'react/react-in-jsx-scope': 'off',

      // Prevent duplicate prop names in JSX — second silently overwrites first.
      'react/jsx-no-duplicate-props': 'error',

      // warn: array indices as keys are fragile on reorder/insert/delete.
      // warn (not error): exceptions exist for stable, non-reordering lists.
      'react/no-array-index-key': 'warn',

      // Prevent components defined inside other components — new function reference
      // on every render causes unnecessary re-mounts and breaks React.memo.
      'react/no-unstable-nested-components': 'error',

      // All list items need a unique, stable key. checkFragmentShorthand catches
      // missing keys on <> ... </> shorthand fragments in array maps.
      'react/jsx-key': ['error', {
        checkFragmentShorthand: true,
        checkKeyMustBeforeSpread: true,
      }],

      // Self-close components and HTML elements that have no children.
      'react/self-closing-comp': ['error', {
        component: true,
        html: true,
      }],

      // warn: encourage readonly props (FP discipline at the component level).
      // warn (not error): third-party component types are often not readonly.
      'react/prefer-read-only-props': 'warn',

      // Enforce destructuring for useState return value.
      // const state = useState(0) → const [value, setValue] = useState(0)
      'react/hook-use-state': 'error',

      // Don't pass explicit true to boolean JSX props.
      // <Component disabled={true} /> → <Component disabled />
      'react/jsx-boolean-value': ['error', 'never'],

      // Use the <> shorthand for fragments; use <React.Fragment key="..."> when key is needed.
      'react/jsx-fragments': ['error', 'syntax'],

      // ── React Hooks — must be error, not warn ──────────────────────────────

      ...reactHooks.configs.recommended.rules,

      // Hooks must only be called at the top level of function components or custom hooks.
      // React's reconciler depends on hooks being called in the same order every render.
      'react-hooks/rules-of-hooks': 'error',

      // All values used inside effects, callbacks, and memos must be in dependency arrays.
      // Incorrect deps cause stale closures — a production bug category, not a style issue.
      // MUST be error, not warn. Stale closures produce silent data corruption.
      'react-hooks/exhaustive-deps': 'error',

      // ── Accessibility — all recommended rules as errors ────────────────────

      // Accessibility issues affect real users. These are product bugs, not style.
      ...jsxA11y.configs.recommended.rules,
    },
  },

  // ── 9. Config and script files: selective relaxation ──────────────────────
  // Configuration files use default exports and import devDependencies by convention.
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
      // off: config files conventionally use default exports
      'import-x/no-default-export': 'off',
      // off: config file types are often loose
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // off: some config files use require() for Node.js compat
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
