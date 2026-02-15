import { describe, it, expect } from 'vitest';
import { toRgba8 } from '../src/lib/renderer/pixel-convert';
import type { RawImageData } from '../src/lib/types';

function makeImage(data: Uint8Array | Uint16Array, channels: number, bitsPerSample: 8 | 16): RawImageData {
	return {
		width: 2,
		height: 1,
		data,
		bitsPerSample,
		channels,
	};
}

describe('toRgba8', () => {
	it('converts 16-bit RGB data to RGBA8', () => {
		const image = makeImage(
			new Uint16Array([
				65535, 32768, 0,
				0, 16384, 65535,
			]),
			3,
			16
		);

		expect(Array.from(toRgba8(image))).toEqual([
			255, 128, 0, 255,
			0, 64, 255, 255,
		]);
	});

	it('maps 8-bit grayscale to RGB channels', () => {
		const image = makeImage(new Uint8Array([10, 200]), 1, 8);

		expect(Array.from(toRgba8(image))).toEqual([
			10, 10, 10, 255,
			200, 200, 200, 255,
		]);
	});

	it('maps 8-bit two-channel data to RGGB-like RGB output', () => {
		const image = makeImage(new Uint8Array([50, 100, 20, 80]), 2, 8);

		expect(Array.from(toRgba8(image))).toEqual([
			50, 100, 100, 255,
			20, 80, 80, 255,
		]);
	});

	it('drops alpha from 8-bit RGBA input', () => {
		const image = makeImage(new Uint8Array([1, 2, 3, 250, 9, 8, 7, 128]), 4, 8);

		expect(Array.from(toRgba8(image))).toEqual([
			1, 2, 3, 255,
			9, 8, 7, 255,
		]);
	});
});
