import type { ImageMetadata, RawImageData } from '../types';

const MAGIC = [0x52, 0x56, 0x44, 0x31]; // "RVD1"
const HEADER_SIZE = 4 + 4 * 6;

export interface DecodeEnvelope {
	image: RawImageData;
	metadata: ImageMetadata;
}

function assert(cond: unknown, message: string): asserts cond {
	if (!cond) {
		throw new Error(message);
	}
}

export function parseDecodeEnvelope(buffer: ArrayBuffer): DecodeEnvelope {
	const bytes = new Uint8Array(buffer);
	assert(bytes.byteLength >= HEADER_SIZE, 'Decode response too short');
	for (let i = 0; i < MAGIC.length; i++) {
		assert(bytes[i] === MAGIC[i], 'Invalid decode response magic');
	}

	const view = new DataView(buffer);
	const width = view.getUint32(4, true);
	const height = view.getUint32(8, true);
	const channels = view.getUint32(12, true);
	const bits = view.getUint32(16, true);
	const pixelByteLength = view.getUint32(20, true);
	const metadataByteLength = view.getUint32(24, true);

	assert(width > 0 && height > 0, 'Invalid image dimensions');
	assert(channels >= 1 && channels <= 4, 'Invalid channel count');
	assert(bits === 8 || bits === 16, 'Invalid bits per sample');

	const metadataOffset = HEADER_SIZE;
	const pixelsOffset = metadataOffset + metadataByteLength;
	const totalExpected = pixelsOffset + pixelByteLength;
	assert(totalExpected <= bytes.byteLength, 'Decode response is truncated');

	const metadataBytes = bytes.subarray(metadataOffset, pixelsOffset);
	const metadataJson = new TextDecoder().decode(metadataBytes);
	const metadata = JSON.parse(metadataJson) as ImageMetadata;

	const pixelBytes = bytes.subarray(pixelsOffset, totalExpected);
	let data: Uint8Array | Uint16Array;
	if (bits === 16) {
		const even = pixelBytes.byteLength - (pixelBytes.byteLength % 2);
		const aligned = (pixelBytes.byteOffset & 1) === 0 ? pixelBytes.subarray(0, even) : pixelBytes.slice(0, even);
		data = new Uint16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
	} else {
		data = pixelBytes;
	}

	return {
		image: {
			width,
			height,
			channels,
			bitsPerSample: bits as 8 | 16,
			data,
		},
		metadata,
	};
}
