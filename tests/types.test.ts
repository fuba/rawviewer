import { describe, it, expect } from 'vitest';
import { defaultAdjustments, defaultToneCurve } from '../src/lib/types';

describe('defaultAdjustments', () => {
	it('returns all parameters at zero defaults', () => {
		const adj = defaultAdjustments();
		expect(adj.exposure).toBe(0);
		expect(adj.temperature).toBe(0);
		expect(adj.tint).toBe(0);
		expect(adj.contrast).toBe(0);
		expect(adj.highlights).toBe(0);
		expect(adj.shadows).toBe(0);
		expect(adj.whites).toBe(0);
		expect(adj.blacks).toBe(0);
		expect(adj.saturation).toBe(0);
		expect(adj.vibrance).toBe(0);
		expect(adj.sharpness).toBe(0);
	});

	it('returns a new object each call', () => {
		const a = defaultAdjustments();
		const b = defaultAdjustments();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});

describe('defaultToneCurve', () => {
	it('returns linear identity curves', () => {
		const curve = defaultToneCurve();
		expect(curve.rgb).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
		expect(curve.red).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
		expect(curve.green).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
		expect(curve.blue).toEqual([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
	});

	it('returns a new object each call', () => {
		const a = defaultToneCurve();
		const b = defaultToneCurve();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});
});
