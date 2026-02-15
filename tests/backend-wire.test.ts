import { describe, expect, it } from 'vitest';
import { parseDecodeEnvelope } from '../src/lib/raw-decoder/backend-wire';

function buildEnvelope(opts: {
	width: number;
	height: number;
	channels: number;
	bitsPerSample: 8 | 16;
	metadata: object;
	pixelBytes: Uint8Array;
}): ArrayBuffer {
	const metadataBytes = new TextEncoder().encode(JSON.stringify(opts.metadata));
	const headerSize = 4 + 4 * 6;
	const totalSize = headerSize + metadataBytes.length + opts.pixelBytes.length;
	const out = new Uint8Array(totalSize);
	const view = new DataView(out.buffer);

	out[0] = 0x52; // R
	out[1] = 0x56; // V
	out[2] = 0x44; // D
	out[3] = 0x31; // 1

	view.setUint32(4, opts.width, true);
	view.setUint32(8, opts.height, true);
	view.setUint32(12, opts.channels, true);
	view.setUint32(16, opts.bitsPerSample, true);
	view.setUint32(20, opts.pixelBytes.length, true);
	view.setUint32(24, metadataBytes.length, true);
	out.set(metadataBytes, headerSize);
	out.set(opts.pixelBytes, headerSize + metadataBytes.length);

	return out.buffer;
}

describe('parseDecodeEnvelope', () => {
	it('parses 16-bit payload and metadata', () => {
		const pixelBytes = new Uint8Array([1, 0, 255, 127, 0, 128, 255, 255, 2, 0, 3, 0]);
		const metadata = {
			make: 'SIGMA',
			model: 'fp',
			iso: 100,
			shutter: 0.003125,
			aperture: 4,
			focalLength: 20,
			width: 6064,
			height: 4042,
			description: '',
			artist: '',
		};
		const buffer = buildEnvelope({
			width: 2,
			height: 1,
			channels: 3,
			bitsPerSample: 16,
			metadata,
			pixelBytes,
		});

		const decoded = parseDecodeEnvelope(buffer);
		expect(decoded.image.width).toBe(2);
		expect(decoded.image.height).toBe(1);
		expect(decoded.image.channels).toBe(3);
		expect(decoded.image.bitsPerSample).toBe(16);
		expect(Array.from(decoded.image.data as Uint16Array)).toEqual([1, 32767, 32768, 65535, 2, 3]);
		expect(decoded.metadata.model).toBe('fp');
	});

	it('throws on invalid magic', () => {
		const bytes = new Uint8Array(32);
		expect(() => parseDecodeEnvelope(bytes.buffer)).toThrow();
	});
});
