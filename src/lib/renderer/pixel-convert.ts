import type { RawImageData } from '../types';

/**
 * Convert decoded RAW pixels to RGBA8 for renderer upload.
 * This normalizes bit depth and handles non-RGB channel layouts safely.
 */
export function toRgba8(image: RawImageData): Uint8Array {
	const pixelCount = image.width * image.height;
	const rgba = new Uint8Array(pixelCount * 4);
	const channels = image.channels;

	if (image.bitsPerSample === 16) {
		const src = image.data as Uint16Array;
		for (let i = 0; i < pixelCount; i++) {
			const srcIdx = i * channels;
			const dstIdx = i * 4;

			let r = 0;
			let g = 0;
			let b = 0;

			if (channels <= 0) {
				// Keep black when source channel data is unavailable.
			} else if (channels === 1) {
				const v = src[srcIdx] >>> 8;
				r = v;
				g = v;
				b = v;
			} else if (channels === 2) {
				r = src[srcIdx] >>> 8;
				const gb = src[srcIdx + 1] >>> 8;
				g = gb;
				b = gb;
			} else {
				r = src[srcIdx] >>> 8;
				g = src[srcIdx + 1] >>> 8;
				b = src[srcIdx + 2] >>> 8;
			}

			rgba[dstIdx] = r;
			rgba[dstIdx + 1] = g;
			rgba[dstIdx + 2] = b;
			rgba[dstIdx + 3] = 255;
		}
		return rgba;
	}

	const src = image.data as Uint8Array;
	for (let i = 0; i < pixelCount; i++) {
		const srcIdx = i * channels;
		const dstIdx = i * 4;

		let r = 0;
		let g = 0;
		let b = 0;

		if (channels <= 0) {
			// Keep black when source channel data is unavailable.
		} else if (channels === 1) {
			const v = src[srcIdx];
			r = v;
			g = v;
			b = v;
		} else if (channels === 2) {
			r = src[srcIdx];
			const gb = src[srcIdx + 1];
			g = gb;
			b = gb;
		} else {
			r = src[srcIdx];
			g = src[srcIdx + 1];
			b = src[srcIdx + 2];
		}

		rgba[dstIdx] = r;
		rgba[dstIdx + 1] = g;
		rgba[dstIdx + 2] = b;
		rgba[dstIdx + 3] = 255;
	}

	return rgba;
}
