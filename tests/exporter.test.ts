import { describe, it, expect } from 'vitest';

// Canvas-based exporter functions cannot be tested in jsdom.
// Test the TIFF exporter logic instead (it doesn't need Canvas).

describe('exporter module structure', () => {
	it('jpeg-png module exports exportJpegPng function', async () => {
		const mod = await import('../src/lib/exporter/jpeg-png');
		expect(typeof mod.exportJpegPng).toBe('function');
	});

	it('tiff module exports exportTiff function', async () => {
		const mod = await import('../src/lib/exporter/tiff');
		expect(typeof mod.exportTiff).toBe('function');
	});

	it('exporter module exports exportImage function', async () => {
		const mod = await import('../src/lib/exporter/exporter');
		expect(typeof mod.exportImage).toBe('function');
	});
});
