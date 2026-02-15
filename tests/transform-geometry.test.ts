import { describe, expect, it } from 'vitest';
import { defaultTransform } from '../src/lib/types';
import {
	aspectPresetToRatio,
	getEffectiveAspect,
	getEffectiveImageSize,
	mapDisplayUvToSourceUv,
	mapSourceUvToDisplayUv,
	getRotatedBounds,
	normalizeCropRect,
} from '../src/lib/transform/geometry';

describe('transform geometry', () => {
	it('maps crop aspect presets to ratios', () => {
		expect(aspectPresetToRatio('free')).toBeNull();
		expect(aspectPresetToRatio('1:1')).toBe(1);
		expect(aspectPresetToRatio('4:3')).toBeCloseTo(4 / 3);
		expect(aspectPresetToRatio('3:2')).toBeCloseTo(3 / 2);
		expect(aspectPresetToRatio('16:9')).toBeCloseTo(16 / 9);
	});

	it('computes rotated bounds', () => {
		const rotated90 = getRotatedBounds(4000, 3000, 90);
		expect(rotated90.width).toBeCloseTo(3000, 3);
		expect(rotated90.height).toBeCloseTo(4000, 3);
	});

	it('computes effective size with rotation and crop', () => {
		const transform = {
			...defaultTransform(),
			rotationDeg: 90,
			cropApplied: true,
			cropRect: { x: 0.1, y: 0.2, width: 0.5, height: 0.5 },
		};
		const size = getEffectiveImageSize(4000, 3000, transform);
		expect(size.width).toBeCloseTo(1500, 3);
		expect(size.height).toBeCloseTo(2000, 3);
		expect(getEffectiveAspect(4000, 3000, transform)).toBeCloseTo(0.75, 3);
	});

	it('normalizes crop rectangles into valid bounds', () => {
		const rect = normalizeCropRect({ x: -0.2, y: 0.8, width: 2, height: 0.5 });
		expect(rect.x).toBe(0);
		expect(rect.y).toBe(0.8);
		expect(rect.width).toBe(1);
		expect(rect.height).toBeCloseTo(0.2, 6);
	});

	it('maps source/display UV without distortion under rotation (round-trip)', () => {
		const width = 6064;
		const height = 4042;
		const rotationDeg = 33;
		const points = [
			{ x: 0.12, y: 0.2 },
			{ x: 0.5, y: 0.5 },
			{ x: 0.82, y: 0.74 },
		];

		for (const p of points) {
			const display = mapSourceUvToDisplayUv(p, width, height, rotationDeg, null);
			const source = mapDisplayUvToSourceUv(display, width, height, rotationDeg, null);
			expect(source.x).toBeCloseTo(p.x, 5);
			expect(source.y).toBeCloseTo(p.y, 5);
		}
	});

	it('keeps mapping consistent with crop + rotation', () => {
		const width = 4000;
		const height = 3000;
		const rotationDeg = -47;
		const crop = { x: 0.12, y: 0.08, width: 0.7, height: 0.82 };
		const sourcePoint = { x: 0.42, y: 0.58 };

		const display = mapSourceUvToDisplayUv(sourcePoint, width, height, rotationDeg, crop);
		const recovered = mapDisplayUvToSourceUv(display, width, height, rotationDeg, crop);
		expect(recovered.x).toBeCloseTo(sourcePoint.x, 5);
		expect(recovered.y).toBeCloseTo(sourcePoint.y, 5);
	});
});
