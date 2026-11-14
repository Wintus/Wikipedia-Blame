import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{ ignores: ['dist', 'coverage'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
		plugins: {
			'react-hooks': reactHooks,
			'react-refresh': reactRefresh,
		},
		rules: {
			...reactHooks.configs['recommended-latest'].rules,
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
			curly: ['error', 'all'],
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
		},
	},
	{
		// Declaration files rely on interface merging (global augmentation,
		// `declare module` blocks); rewriting them to type aliases changes meaning.
		files: ['**/*.d.ts'],
		rules: {
			'@typescript-eslint/consistent-type-definitions': 'off',
		},
	},
);
