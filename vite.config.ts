import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte()],
	server: {
		host: '0.0.0.0',
		port: 5173,
		allowedHosts: ['rawviewer.fuba.dev'],
		proxy: {
			'/api': {
				target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
				changeOrigin: true,
				timeout: 10 * 60 * 1000,
				proxyTimeout: 10 * 60 * 1000,
			},
		},
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
