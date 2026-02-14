import type { RawImageData, ImageMetadata } from '../types';

export interface DecodeResult {
	image: RawImageData;
	metadata: ImageMetadata;
}

let librawInstance: any = null;

async function getLibRaw(): Promise<any> {
	if (!librawInstance) {
		const LibRaw = (await import('libraw-wasm')).default;
		librawInstance = new LibRaw();
	}
	return librawInstance;
}

/**
 * Decode a RAW file buffer into RGB pixel data and metadata.
 * libraw-wasm internally uses a Web Worker, so this won't block the main thread.
 */
export async function decodeRawFile(buffer: ArrayBuffer): Promise<DecodeResult> {
	const raw = await getLibRaw();

	// Open the file with camera WB and 16-bit output for maximum quality
	await raw.open(new Uint8Array(buffer), {
		useCameraWb: true,
		outputBps: 16,
		outputColor: 1, // sRGB
		noAutoBright: true,
		highlight: 0,
	});

	// Get metadata
	const meta = await raw.metadata(true);

	// Get decoded pixel data
	const imgData = await raw.imageData();

	// Convert metadata to our format
	const metadata: ImageMetadata = {
		make: meta.camera_make || '',
		model: meta.camera_model || '',
		iso: meta.iso_speed || 0,
		shutter: meta.shutter || 0,
		aperture: meta.aperture || 0,
		focalLength: meta.focal_len || 0,
		width: meta.width,
		height: meta.height,
		description: meta.desc || '',
		artist: meta.artist || '',
	};

	// Convert to our image format
	const bitsPerSample = imgData.bits as 8 | 16;
	let data: Uint8Array | Uint16Array;

	if (bitsPerSample === 16) {
		// imgData.data is Uint8Array but contains 16-bit values (little-endian)
		// Re-interpret as Uint16Array
		const aligned = new Uint8Array(imgData.data);
		data = new Uint16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
	} else {
		data = new Uint8Array(imgData.data);
	}

	const image: RawImageData = {
		width: imgData.width,
		height: imgData.height,
		data,
		bitsPerSample,
		channels: imgData.colors,
	};

	return { image, metadata };
}
