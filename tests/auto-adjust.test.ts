import { describe, expect, it } from 'vitest';
import { computeAutoAdjustments } from '../src/lib/auto-adjust/auto-adjust';
import { defaultAdjustments, defaultTransform, type RawImageData } from '../src/lib/types';

function makeImage(
	width: number,
	height: number,
	getRgb: (x: number, y: number) => [number, number, number]
): RawImageData {
	const data = new Uint8Array(width * height * 3);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [r, g, b] = getRgb(x, y);
			const idx = (y * width + x) * 3;
			data[idx] = Math.max(0, Math.min(255, Math.round(r)));
			data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
			data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
		}
	}
	return {
		width,
		height,
		data,
		bitsPerSample: 8,
		channels: 3,
	};
}

describe('computeAutoAdjustments', () => {
	it('raises exposure for dark scenes', () => {
		const dark = makeImage(64, 64, () => [26, 26, 26]);
		const out = computeAutoAdjustments(dark, defaultAdjustments(), defaultTransform());
		expect(out.exposure).toBeGreaterThan(0.6);
		expect(out.shadows).toBeGreaterThan(0);
	});

	it('lowers exposure and highlights for bright scenes', () => {
		const bright = makeImage(64, 64, () => [240, 240, 240]);
		const out = computeAutoAdjustments(bright, defaultAdjustments(), defaultTransform());
		expect(out.exposure).toBeLessThan(0);
		expect(out.highlights).toBeLessThanOrEqual(0);
	});

	it('moves temperature warmer for blue cast and cooler for red cast', () => {
		const blueCast = makeImage(80, 80, () => [110, 130, 215]);
		const warmOut = computeAutoAdjustments(blueCast, defaultAdjustments(), defaultTransform());
		expect(warmOut.temperature).toBeGreaterThan(0);

		const redCast = makeImage(80, 80, () => [215, 130, 110]);
		const coolOut = computeAutoAdjustments(redCast, defaultAdjustments(), defaultTransform());
		expect(coolOut.temperature).toBeLessThan(0);
	});

	it('uses crop region statistics when crop is applied', () => {
		const mixed = makeImage(120, 40, (x) => (x < 60 ? [22, 22, 22] : [235, 235, 235]));
		const full = computeAutoAdjustments(mixed, defaultAdjustments(), defaultTransform());
		const cropped = computeAutoAdjustments(mixed, defaultAdjustments(), {
			...defaultTransform(),
			cropApplied: true,
			cropRect: { x: 0, y: 0, width: 0.5, height: 1 },
		});
		expect(cropped.exposure).toBeGreaterThan(full.exposure + 0.5);
	});
});
