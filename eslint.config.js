import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  eslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  {
    ignores: ['dist/'],
    rules: {
      curly: ['error', 'all'],
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      'id-length': ['error', { min: 2, exceptions: ['i', 'j', 'k'] }],
    },
  }
);
