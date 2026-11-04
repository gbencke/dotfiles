// Cognitive-complexity-only ESLint config for the pinned-debt skill.
// Threshold 0 makes sonarjs report every function with a score above 0,
// so the message carries the score of each function.
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

export default [
  {
    files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: { sonarjs },
    rules: { 'sonarjs/cognitive-complexity': ['error', 0] },
  },
];
