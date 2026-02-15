export interface DecodedLayoutInput {
	width: number;
	height: number;
	channels: number;
	bitsPerSample: 8 | 16;
	byteLength: number;
}

export interface DecodedLayout {
	width: number;
	height: number;
	channels: number;
	bitsPerSample: 8 | 16;
	expectedByteLength: number;
	hasMismatch: boolean;
}

/**
 * Normalize decoded image layout when decoder metadata and payload length diverge.
 */
export function normalizeDecodedLayout(input: DecodedLayoutInput): DecodedLayout {
	let width = Math.max(1, Math.floor(input.width));
	let height = Math.max(1, Math.floor(input.height));
	let channels = Math.max(1, Math.floor(input.channels));
	let bitsPerSample: 8 | 16 = input.bitsPerSample;
	const byteLength = Math.max(0, Math.floor(input.byteLength));
	const sampleCount = width * height * channels;

	// libraw-wasm may sometimes report bits=16 while the returned payload is 8-bit packed.
	if (bitsPerSample === 16 && sampleCount > 0 && byteLength === sampleCount) {
		bitsPerSample = 8;
	}

	let bytesPerSample = bitsPerSample === 16 ? 2 : 1;

	const initialExpected = width * height * channels * (input.bitsPerSample === 16 ? 2 : 1);

	if (initialExpected !== byteLength) {
		const pixels = width * height;
		if (pixels > 0) {
			const inferredChannels = byteLength / (pixels * bytesPerSample);
			if (Number.isInteger(inferredChannels) && inferredChannels >= 1 && inferredChannels <= 4) {
				channels = inferredChannels;
			}
		}
	}

	let expected = width * height * channels * bytesPerSample;

	if (expected > byteLength) {
		const availablePixels = Math.floor(byteLength / (channels * bytesPerSample));
		if (availablePixels > 0) {
			if (availablePixels % width === 0) {
				height = availablePixels / width;
			} else if (availablePixels % height === 0) {
				width = availablePixels / height;
			} else {
				const aspect = width / height;
				let fittedWidth = Math.max(1, Math.round(Math.sqrt(availablePixels * aspect)));
				if (fittedWidth > availablePixels) fittedWidth = availablePixels;
				let fittedHeight = Math.max(1, Math.floor(availablePixels / fittedWidth));
				while (fittedWidth * fittedHeight > availablePixels && fittedWidth > 1) {
					fittedWidth--;
					fittedHeight = Math.max(1, Math.floor(availablePixels / fittedWidth));
				}
				width = fittedWidth;
				height = fittedHeight;
			}
		}
		expected = width * height * channels * bytesPerSample;
	}

	return {
		width,
		height,
		channels,
		bitsPerSample,
		expectedByteLength: Math.min(expected, byteLength),
		hasMismatch: initialExpected !== byteLength || bitsPerSample !== input.bitsPerSample,
	};
}
