import UTIF from 'utif';

/**
 * Export 8-bit TIFF from rendered pixel data.
 */
export function exportTiff(
	pixels: Uint8Array,
	width: number,
	height: number
): Blob {
	// WebGL readPixels returns bottom-up RGBA, flip vertically
	const flipped = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		const srcRow = (height - 1 - y) * width * 4;
		const dstRow = y * width * 4;
		flipped.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
	}

	// UTIF.encodeImage expects RGBA data
	const ifd = {
		t256: [width],       // ImageWidth
		t257: [height],      // ImageLength
		t258: [8, 8, 8, 8],  // BitsPerSample (RGBA)
		t259: [1],           // Compression: None
		t262: [2],           // PhotometricInterpretation: RGB
		t273: [0],           // StripOffsets (filled by encoder)
		t277: [4],           // SamplesPerPixel
		t278: [height],      // RowsPerStrip
		t279: [width * height * 4], // StripByteCounts
		t282: [72],          // XResolution
		t283: [72],          // YResolution
		t296: [2],           // ResolutionUnit: inch
		t338: [2],           // ExtraSamples: unassociated alpha
	} as unknown as UTIF.IFD;

	const encoded = UTIF.encodeImage(flipped, width, height, ifd);
	return new Blob([encoded], { type: 'image/tiff' });
}
