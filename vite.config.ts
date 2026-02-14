import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	build: {
		target: 'es2022',
	},
	worker: {
		format: 'es',
	},
	optimizeDeps: {
		exclude: ['libraw-wasm'],
	},
});
