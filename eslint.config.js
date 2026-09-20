import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      prettier,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Object types are written as `type`, never `interface`.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // No classes. Behaviour is plain functions over plain data — including
      // the value objects, where the behaviour lives beside the type rather
      // than on it. Constructing a class a library owns is still fine.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message: 'Use a function and a plain type instead of a class.',
        },
        {
          selector: 'ClassExpression',
          message: 'Use a function and a plain type instead of a class.',
        },
      ],
    },
  },
  // Config files are JavaScript and sit outside the TypeScript program, so they
  // need their own block or they would be linted under no rules at all.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended, prettier],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
);
