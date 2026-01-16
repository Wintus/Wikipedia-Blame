/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
	base: '/Wikipedia-Blame/',
	plugins: [
		react({
			babel: {
				plugins: ['babel-plugin-react-compiler'],
			},
		}),
	],
	test: {
		globals: true,
		environment: 'happy-dom',
		includeSource: ['src/**/*.{js,ts,jsx,tsx}'],
		setupFiles: './src/setupTests.ts',
	},
	define: {
		'import.meta.vitest': 'undefined',
	},
});
