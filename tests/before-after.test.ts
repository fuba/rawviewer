import { describe, expect, it } from 'vitest';
import { clampBeforeAfterSplit, resolveBeforeAfterSplitFromPointer } from '../src/lib/viewer/before-after';

describe('before-after split helpers', () => {
	it('clamps split into safe range', () => {
		expect(clampBeforeAfterSplit(-1)).toBe(0.02);
		expect(clampBeforeAfterSplit(0)).toBe(0.02);
		expect(clampBeforeAfterSplit(0.5)).toBe(0.5);
		expect(clampBeforeAfterSplit(1)).toBe(0.98);
		expect(clampBeforeAfterSplit(2)).toBe(0.98);
	});

	it('resolves split from pointer position', () => {
		expect(resolveBeforeAfterSplitFromPointer(200, 100, 200)).toBe(0.5);
		expect(resolveBeforeAfterSplitFromPointer(80, 100, 200)).toBe(0.02);
		expect(resolveBeforeAfterSplitFromPointer(350, 100, 200)).toBe(0.98);
	});

	it('falls back to center for invalid bounds', () => {
		expect(resolveBeforeAfterSplitFromPointer(120, 100, 0)).toBe(0.5);
		expect(resolveBeforeAfterSplitFromPointer(120, 100, Number.NaN)).toBe(0.5);
	});
});
