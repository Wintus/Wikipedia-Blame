import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// https://vitest.dev/guide/#configuring-vitest
export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			globals: true,
			environment: 'happy-dom',
			includeSource: ['src/**/*.{js,ts,jsx,tsx}'],
			setupFiles: './src/setupTests.ts',
		},
		define: {
			'import.meta.vitest': 'undefined',
		},
	})
);
