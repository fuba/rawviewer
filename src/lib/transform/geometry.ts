import type { CropAspectPreset, CropRect, TransformParams } from '../types';

export function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function aspectPresetToRatio(preset: CropAspectPreset): number | null {
	switch (preset) {
		case '1:1': return 1;
		case '4:3': return 4 / 3;
		case '3:2': return 3 / 2;
		case '16:9': return 16 / 9;
		default: return null;
	}
}

export function normalizeCropRect(rect: CropRect): CropRect {
	const x = clamp01(rect.x);
	const y = clamp01(rect.y);
	const width = clamp01(rect.width);
	const height = clamp01(rect.height);
	return {
		x,
		y,
		width: Math.max(0.0001, Math.min(width, 1 - x)),
		height: Math.max(0.0001, Math.min(height, 1 - y)),
	};
}

export function getRotatedBounds(width: number, height: number, rotationDeg: number): { width: number; height: number } {
	const w = Math.max(1, width);
	const h = Math.max(1, height);
	const r = (rotationDeg * Math.PI) / 180;
	const c = Math.abs(Math.cos(r));
	const s = Math.abs(Math.sin(r));
	return {
		width: w * c + h * s,
		height: w * s + h * c,
	};
}

export function getEffectiveImageSize(
	sourceWidth: number,
	sourceHeight: number,
	transform: TransformParams
): { width: number; height: number } {
	const rotated = getRotatedBounds(sourceWidth, sourceHeight, transform.rotationDeg);
	if (!transform.cropApplied || !transform.cropRect) {
		return rotated;
	}
	const crop = normalizeCropRect(transform.cropRect);
	return {
		width: rotated.width * crop.width,
		height: rotated.height * crop.height,
	};
}

export function getEffectiveAspect(
	sourceWidth: number,
	sourceHeight: number,
	transform: TransformParams
): number {
	const size = getEffectiveImageSize(sourceWidth, sourceHeight, transform);
	if (size.height <= 0) return 1;
	return size.width / size.height;
}

interface UvPoint {
	x: number;
	y: number;
}

export function mapDisplayUvToSourceUv(
	uvDisplay: UvPoint,
	sourceWidth: number,
	sourceHeight: number,
	rotationDeg: number,
	cropRect: CropRect | null
): UvPoint {
	const sw = Math.max(1, sourceWidth);
	const sh = Math.max(1, sourceHeight);

	const crop = cropRect ? normalizeCropRect(cropRect) : null;
	const uv = crop
		? {
			x: crop.x + uvDisplay.x * crop.width,
			y: crop.y + uvDisplay.y * crop.height,
		}
		: uvDisplay;

	const r = (rotationDeg * Math.PI) / 180;
	const c = Math.cos(r);
	const s = Math.sin(r);
	const rotated = getRotatedBounds(sw, sh, rotationDeg);
	const px = (uv.x - 0.5) * rotated.width;
	const py = (uv.y - 0.5) * rotated.height;
	const sx = c * px + s * py;
	const sy = -s * px + c * py;

	return {
		x: sx / sw + 0.5,
		y: sy / sh + 0.5,
	};
}

export function mapSourceUvToDisplayUv(
	uvSource: UvPoint,
	sourceWidth: number,
	sourceHeight: number,
	rotationDeg: number,
	cropRect: CropRect | null
): UvPoint {
	const sw = Math.max(1, sourceWidth);
	const sh = Math.max(1, sourceHeight);
	const r = (rotationDeg * Math.PI) / 180;
	const c = Math.cos(r);
	const s = Math.sin(r);
	const rotated = getRotatedBounds(sw, sh, rotationDeg);

	const sx = (uvSource.x - 0.5) * sw;
	const sy = (uvSource.y - 0.5) * sh;
	const px = c * sx - s * sy;
	const py = s * sx + c * sy;

	let uvRotated = {
		x: px / rotated.width + 0.5,
		y: py / rotated.height + 0.5,
	};

	if (cropRect) {
		const crop = normalizeCropRect(cropRect);
		uvRotated = {
			x: (uvRotated.x - crop.x) / crop.width,
			y: (uvRotated.y - crop.y) / crop.height,
		};
	}

	return uvRotated;
}
