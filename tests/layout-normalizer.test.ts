import { describe, it, expect } from 'vitest';
import { normalizeDecodedLayout } from '../src/lib/raw-decoder/layout-normalizer';

describe('normalizeDecodedLayout', () => {
	it('keeps valid layout as-is', () => {
		const normalized = normalizeDecodedLayout({
			width: 4,
			height: 3,
			channels: 3,
			bitsPerSample: 8,
			byteLength: 36,
		});

		expect(normalized).toEqual({
			width: 4,
			height: 3,
			channels: 3,
			bitsPerSample: 8,
			expectedByteLength: 36,
			hasMismatch: false,
		});
	});

	it('infers channels from payload length', () => {
		const normalized = normalizeDecodedLayout({
			width: 4,
			height: 2,
			channels: 4,
			bitsPerSample: 8,
			byteLength: 24,
		});

		expect(normalized.channels).toBe(3);
		expect(normalized.bitsPerSample).toBe(8);
		expect(normalized.expectedByteLength).toBe(24);
		expect(normalized.hasMismatch).toBe(true);
	});

	it('shrinks dimensions when payload is smaller than declared', () => {
		const normalized = normalizeDecodedLayout({
			width: 10,
			height: 10,
			channels: 3,
			bitsPerSample: 8,
			byteLength: 90,
		});

		expect(normalized.width).toBe(10);
		expect(normalized.height).toBe(3);
		expect(normalized.bitsPerSample).toBe(8);
		expect(normalized.expectedByteLength).toBe(90);
		expect(normalized.hasMismatch).toBe(true);
	});

	it('trims excess bytes by expected length', () => {
		const normalized = normalizeDecodedLayout({
			width: 4,
			height: 2,
			channels: 3,
			bitsPerSample: 8,
			byteLength: 25,
		});

		expect(normalized.width).toBe(4);
		expect(normalized.height).toBe(2);
		expect(normalized.channels).toBe(3);
		expect(normalized.bitsPerSample).toBe(8);
		expect(normalized.expectedByteLength).toBe(24);
		expect(normalized.hasMismatch).toBe(true);
	});

	it('treats mislabeled 16-bit payload as effective 8-bit', () => {
		const normalized = normalizeDecodedLayout({
			width: 6064,
			height: 4042,
			channels: 3,
			bitsPerSample: 16,
			byteLength: 6064 * 4042 * 3,
		});

		expect(normalized.width).toBe(6064);
		expect(normalized.height).toBe(4042);
		expect(normalized.channels).toBe(3);
		expect(normalized.bitsPerSample).toBe(8);
		expect(normalized.expectedByteLength).toBe(6064 * 4042 * 3);
		expect(normalized.hasMismatch).toBe(true);
	});
});
