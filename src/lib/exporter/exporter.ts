import type { ExportOptions } from '../types';
import type { IRenderer } from '../renderer/renderer-interface';
import { exportJpegPng } from './jpeg-png';
import { exportTiff } from './tiff';
import { resolveExportSize } from './size';

/**
 * Export the current rendered image.
 */
export async function exportImage(
	renderer: IRenderer,
	options: ExportOptions
): Promise<void> {
	const canvas = renderer.getCanvas();
	const sourceWidth = canvas.width;
	const sourceHeight = canvas.height;
	const sourcePixels = renderer.readPixels();
	const resolved = resolveExportSize(
		sourceWidth,
		sourceHeight,
		options.targetWidth,
		options.targetHeight,
		options.upscale
	);

	const resized = (resolved.width === sourceWidth && resolved.height === sourceHeight)
		? sourcePixels
		: resizePixelsBottomUp(sourcePixels, sourceWidth, sourceHeight, resolved.width, resolved.height);

	await exportPixels(resized, resolved.width, resolved.height, options);
}

function resizePixelsBottomUp(
	pixels: Uint8Array,
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number
): Uint8Array {
	const srcCanvas = document.createElement('canvas');
	srcCanvas.width = sourceWidth;
	srcCanvas.height = sourceHeight;
	const srcCtx = srcCanvas.getContext('2d');
	if (!srcCtx) {
		throw new Error('Failed to get 2D context for source canvas');
	}

	const srcData = srcCtx.createImageData(sourceWidth, sourceHeight);
	for (let y = 0; y < sourceHeight; y++) {
		const srcRow = (sourceHeight - 1 - y) * sourceWidth * 4;
		const dstRow = y * sourceWidth * 4;
		srcData.data.set(pixels.subarray(srcRow, srcRow + sourceWidth * 4), dstRow);
	}
	srcCtx.putImageData(srcData, 0, 0);

	const dstCanvas = document.createElement('canvas');
	dstCanvas.width = targetWidth;
	dstCanvas.height = targetHeight;
	const dstCtx = dstCanvas.getContext('2d');
	if (!dstCtx) {
		throw new Error('Failed to get 2D context for target canvas');
	}
	dstCtx.imageSmoothingEnabled = true;
	dstCtx.imageSmoothingQuality = 'high';
	dstCtx.drawImage(srcCanvas, 0, 0, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);

	const topDown = dstCtx.getImageData(0, 0, targetWidth, targetHeight).data;
	const out = new Uint8Array(targetWidth * targetHeight * 4);
	for (let y = 0; y < targetHeight; y++) {
		const srcRow = y * targetWidth * 4;
		const dstRow = (targetHeight - 1 - y) * targetWidth * 4;
		out.set(topDown.subarray(srcRow, srcRow + targetWidth * 4), dstRow);
	}
	return out;
}

export async function exportPixels(
	pixels: Uint8Array,
	width: number,
	height: number,
	options: Pick<ExportOptions, 'format' | 'quality' | 'filename'>
): Promise<void> {
	let blob: Blob;

	if (options.format === 'tiff') {
		blob = exportTiff(pixels, width, height);
	} else {
		blob = await exportJpegPng(pixels, width, height, options.format, options.quality);
	}

	await saveFile(blob, options.filename, options.format);
}

export async function exportCanvasImage(
	canvas: HTMLCanvasElement | OffscreenCanvas,
	options: Pick<ExportOptions, 'format' | 'quality' | 'filename'>
): Promise<void> {
	if (options.format === 'tiff') {
		throw new Error('TIFF export requires pixel buffer path');
	}
	const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
	const quality = options.format === 'jpeg' ? options.quality / 100 : undefined;

	let blob: Blob;
	if ('convertToBlob' in canvas) {
		blob = await (canvas as OffscreenCanvas).convertToBlob({ type: mimeType, quality });
	} else {
		blob = await new Promise<Blob>((resolve, reject) => {
			(canvas as HTMLCanvasElement).toBlob((b) => {
				if (!b) {
					reject(new Error('Canvas.toBlob returned null'));
					return;
				}
				resolve(b);
			}, mimeType, quality);
		});
	}

	await saveFile(blob, options.filename, options.format);
}

/**
 * Save a blob to disk, using File System Access API if available.
 */
async function saveFile(blob: Blob, filename: string, format: string): Promise<void> {
	const mimeTypes: Record<string, string> = {
		jpeg: 'image/jpeg',
		png: 'image/png',
		tiff: 'image/tiff',
	};
	const extensions: Record<string, string> = {
		jpeg: '.jpg',
		png: '.png',
		tiff: '.tiff',
	};

	// Try File System Access API first (Chrome/Edge)
	if ('showSaveFilePicker' in window) {
		try {
			const handle = await (window as any).showSaveFilePicker({
				suggestedName: filename + extensions[format],
				types: [{
					description: `${format.toUpperCase()} Image`,
					accept: { [mimeTypes[format]]: [extensions[format]] },
				}],
			});
			const writable = await handle.createWritable();
			await writable.write(blob);
			await writable.close();
			return;
		} catch (err: any) {
			// User cancelled or API not supported, fall through to download
			if (err.name === 'AbortError') return;
		}
	}

	// Fallback: create download link
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename + extensions[format];
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}
