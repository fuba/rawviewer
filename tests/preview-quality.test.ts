import { describe, expect, it } from 'vitest';
import { resolvePreviewPixelRatio } from '../src/lib/renderer/preview-quality';

describe('resolvePreviewPixelRatio', () => {
	it('caps DPR harder during interactions', () => {
		expect(resolvePreviewPixelRatio(2, true)).toBe(1);
		expect(resolvePreviewPixelRatio(3, true)).toBe(1);
	});

	it('allows a bit higher DPR when idle', () => {
		expect(resolvePreviewPixelRatio(2, false)).toBe(1.5);
		expect(resolvePreviewPixelRatio(1.25, false)).toBe(1.25);
	});

	it('clamps invalid DPR values safely', () => {
		expect(resolvePreviewPixelRatio(0, false)).toBe(1);
		expect(resolvePreviewPixelRatio(Number.NaN, true)).toBe(1);
	});
});
