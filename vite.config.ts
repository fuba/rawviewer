import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		allowedHosts: ['rawviewer.fuba.dev'],
	},
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
