/**
 * Export JPEG or PNG using native Canvas.toBlob.
 */
export function exportJpegPng(
	pixels: Uint8Array,
	width: number,
	height: number,
	format: 'jpeg' | 'png',
	quality: number
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			reject(new Error('Failed to get 2D context'));
			return;
		}

		// WebGL readPixels returns bottom-up, flip vertically
		const imageData = ctx.createImageData(width, height);
		for (let y = 0; y < height; y++) {
			const srcRow = (height - 1 - y) * width * 4;
			const dstRow = y * width * 4;
			for (let x = 0; x < width * 4; x++) {
				imageData.data[dstRow + x] = pixels[srcRow + x];
			}
		}

		ctx.putImageData(imageData, 0, 0);

		const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
		const q = format === 'jpeg' ? quality / 100 : undefined;

		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error('Canvas.toBlob returned null'));
				}
			},
			mimeType,
			q
		);
	});
}
