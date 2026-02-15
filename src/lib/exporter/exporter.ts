import type { ExportOptions } from '../types';
import type { IRenderer } from '../renderer/renderer-interface';
import { exportJpegPng } from './jpeg-png';
import { exportTiff } from './tiff';

/**
 * Export the current rendered image.
 */
export async function exportImage(
	renderer: IRenderer,
	options: ExportOptions
): Promise<void> {
	const canvas = renderer.getCanvas();
	const width = canvas.width;
	const height = canvas.height;
	const pixels = renderer.readPixels();

	let blob: Blob;

	if (options.format === 'tiff') {
		blob = exportTiff(pixels, width, height);
	} else {
		blob = await exportJpegPng(pixels, width, height, options.format, options.quality);
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
