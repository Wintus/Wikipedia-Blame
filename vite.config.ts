/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
	base: '/Wikipedia-Blame/',
	plugins: [
		react(),
		babel({
			presets: [reactCompilerPreset()],
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
