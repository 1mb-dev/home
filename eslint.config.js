import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['todos/', '.claude/', 'workers/.wrangler/'] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    // Style (quotes, semicolons) is Prettier's job
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['docs/assets/js/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['docs/sw.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
  },
  {
    files: ['scripts/**/*.{js,mjs}', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // Workers runtime: service-worker globals (fetch, Request, Response, crypto)
    files: ['workers/*.js'],
    languageOptions: { globals: { ...globals.serviceworker, console: 'readonly' } },
  },
];
