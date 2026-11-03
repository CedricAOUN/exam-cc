import js from '@eslint/js';
import globals from 'globals';
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'] },
  {
    files: ['backend/**/*.js', 'gateway/**/*.js', 'microservices/**/*.js'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs', globals: globals.node },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { files: ['docker/*.js'], languageOptions: { globals: { rs: 'readonly', quit: 'readonly' } } },
];
