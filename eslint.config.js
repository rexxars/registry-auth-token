import js from '@eslint/js'
import prettier from 'eslint-config-prettier/flat'
import perfectionist from 'eslint-plugin-perfectionist'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'

export default [
  js.configs.recommended,
  unicorn.configs.recommended,
  perfectionist.configs['recommended-natural'],

  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },

  {
    files: ['test/**/*.js'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
    },
  },

  {
    ignores: ['coverage/**'],
  },

  prettier,
]
