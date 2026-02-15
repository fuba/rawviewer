import { describe, expect, it } from 'vitest';
import { resolveExportSize } from '../src/lib/exporter/size';

describe('resolveExportSize', () => {
	it('keeps aspect ratio from source dimensions', () => {
		const out = resolveExportSize(4000, 2000, 1000, 1000, true);
		expect(out).toEqual({ width: 1000, height: 500 });
	});

	it('does not upscale when disabled', () => {
		const out = resolveExportSize(3000, 2000, 6000, 6000, false);
		expect(out).toEqual({ width: 3000, height: 2000 });
	});

	it('allows upscale when enabled', () => {
		const out = resolveExportSize(3000, 2000, 6000, 6000, true);
		expect(out).toEqual({ width: 6000, height: 4000 });
	});

	it('clamps invalid target dimensions', () => {
		const out = resolveExportSize(3000, 2000, -10, 0, true);
		expect(out).toEqual({ width: 1, height: 1 });
	});
});
