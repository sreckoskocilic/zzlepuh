import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Standalone config (no SvelteKit plugin) for unit-testing the frontend
// business-logic layer: stores, persistence, and pure helpers. Components and
// flows are covered by Playwright E2E. The svelte plugin is needed so $state
// runes in *.svelte.ts modules are compiled.
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		},
		// Use svelte's client reactivity (not SSR) so $state behaves at runtime.
		conditions: ['browser']
	},
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts']
	}
});
