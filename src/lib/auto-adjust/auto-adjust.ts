import type { AdjustmentParams, RawImageData, TransformParams } from '../types';
import { toRgba8 } from '../renderer/pixel-convert';
import { defaultAdjustments } from '../types';

function clamp(v: number, min: number, max: number): number {
	return v < min ? min : v > max ? max : v;
}

function quantile(sorted: number[], q: number): number {
	if (sorted.length === 0) return 0;
	const idx = clamp(Math.floor(q * (sorted.length - 1)), 0, sorted.length - 1);
	return sorted[idx];
}

interface Stats {
	luminance: number[];
	sumR: number;
	sumG: number;
	sumB: number;
	sumSat: number;
	edgeWeightedR: number;
	edgeWeightedG: number;
	edgeWeightedB: number;
	edgeWeight: number;
	count: number;
}

function createStats(): Stats {
	return {
		luminance: [],
		sumR: 0,
		sumG: 0,
		sumB: 0,
		sumSat: 0,
		edgeWeightedR: 0,
		edgeWeightedG: 0,
		edgeWeightedB: 0,
		edgeWeight: 0,
		count: 0,
	};
}

function safeDiv(a: number, b: number): number {
	if (Math.abs(b) < 1e-9) return 0;
	return a / b;
}

export function computeAutoAdjustments(
	image: RawImageData,
	current: AdjustmentParams,
	transform: TransformParams
): AdjustmentParams {
	const rgba = toRgba8(image);
	const stats = createStats();

	const crop = transform.cropApplied && transform.cropRect ? transform.cropRect : { x: 0, y: 0, width: 1, height: 1 };
	const x0 = Math.max(0, Math.floor(crop.x * image.width));
	const y0 = Math.max(0, Math.floor(crop.y * image.height));
	const x1 = Math.min(image.width, Math.ceil((crop.x + crop.width) * image.width));
	const y1 = Math.min(image.height, Math.ceil((crop.y + crop.height) * image.height));

	const targetSamples = 180000;
	const totalPixels = Math.max(1, (x1 - x0) * (y1 - y0));
	const stride = Math.max(1, Math.floor(Math.sqrt(totalPixels / targetSamples)));

	// Rotation-aware sampling is intentionally skipped for speed; crop still constrains the region.
	for (let y = y0; y < y1; y += stride) {
		for (let x = x0; x < x1; x += stride) {
			const idx = (y * image.width + x) * 4;
			const r = rgba[idx] / 255;
			const g = rgba[idx + 1] / 255;
			const b = rgba[idx + 2] / 255;

			const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
			const max = Math.max(r, g, b);
			const min = Math.min(r, g, b);
			const sat = max <= 0 ? 0 : (max - min) / max;

			stats.luminance.push(l);
			stats.sumR += r;
			stats.sumG += g;
			stats.sumB += b;
			stats.sumSat += sat;
			stats.count++;

			const nx = Math.min(x + stride, x1 - 1);
			const ny = Math.min(y + stride, y1 - 1);
			if (nx !== x || ny !== y) {
				const right = (y * image.width + nx) * 4;
				const down = (ny * image.width + x) * 4;
				const rr = rgba[right] / 255;
				const rg = rgba[right + 1] / 255;
				const rb = rgba[right + 2] / 255;
				const dr = rgba[down] / 255;
				const dg = rgba[down + 1] / 255;
				const db = rgba[down + 2] / 255;

				const gradR = Math.abs(r - rr) + Math.abs(r - dr);
				const gradG = Math.abs(g - rg) + Math.abs(g - dg);
				const gradB = Math.abs(b - rb) + Math.abs(b - db);
				const edge = gradR + gradG + gradB;

				if (edge > 1e-5) {
					stats.edgeWeightedR += r * edge;
					stats.edgeWeightedG += g * edge;
					stats.edgeWeightedB += b * edge;
					stats.edgeWeight += edge;
				}
			}
		}
	}

	if (stats.count === 0) {
		return current;
	}

	const lum = stats.luminance.sort((a, b) => a - b);
	const p1 = quantile(lum, 0.01);
	const p5 = quantile(lum, 0.05);
	const p10 = quantile(lum, 0.10);
	const p50 = quantile(lum, 0.50);
	const p90 = quantile(lum, 0.90);
	const p95 = quantile(lum, 0.95);
	const p99 = quantile(lum, 0.99);
	const dynamic = Math.max(0.0001, p95 - p5);

	const avgR = stats.sumR / stats.count;
	const avgG = stats.sumG / stats.count;
	const avgB = stats.sumB / stats.count;
	const avgSat = stats.sumSat / stats.count;

	const edgeR = stats.edgeWeight > 0 ? safeDiv(stats.edgeWeightedR, stats.edgeWeight) : avgR;
	const edgeG = stats.edgeWeight > 0 ? safeDiv(stats.edgeWeightedG, stats.edgeWeight) : avgG;
	const edgeB = stats.edgeWeight > 0 ? safeDiv(stats.edgeWeightedB, stats.edgeWeight) : avgB;
	const edgeConfidence = clamp(stats.edgeWeight / (stats.count * 0.25 + 1e-6), 0, 1);
	const wbMix = 0.35 + edgeConfidence * 0.5; // 0.35..0.85

	const wbR = edgeR * wbMix + avgR * (1 - wbMix);
	const wbG = edgeG * wbMix + avgG * (1 - wbMix);
	const wbB = edgeB * wbMix + avgB * (1 - wbMix);

	// Exposure from percentiles: protect highlights while lifting mids.
	const targetP95 = 0.90;
	const targetMid = 0.40;
	const exposureHighlight = Math.log2((targetP95 + 1e-6) / (p95 + 1e-6));
	const exposureMid = Math.log2((targetMid + 1e-6) / (p50 + 1e-6));
	let exposure = clamp(0.7 * exposureHighlight + 0.3 * exposureMid, -2.2, 2.2);
	if (p99 > 0.995) {
		exposure = Math.min(exposure, -0.3);
	}

	const contrast = clamp((0.62 - dynamic) * 70, -35, 35);
	const highlights = clamp(-(Math.max(0, p95 - 0.78) * 180 + Math.max(0, p99 - 0.95) * 320), -100, 0);
	const shadows = clamp((0.20 - p10) * 220, -20, 85);
	const whites = clamp((0.80 - p99) * 80, -60, 30);
	const blacks = clamp((0.03 - p1) * 260, -20, 45);

	const saturation = clamp((0.34 - avgSat) * 80, -20, 25);
	const vibrance = clamp((0.35 - avgSat) * 120, -25, 45);

	// Estimate WB gains using mixed Gray-World / Gray-Edge statistics.
	const rbFactor = (wbB + 1e-6) / (wbR + 1e-6);
	const tNorm = clamp((rbFactor - 1) / (0.3 * (rbFactor + 1)), -1, 1);
	const temperature = clamp(tNorm * 70, -70, 70);

	const rbMean = (wbR + wbB) * 0.5;
	const gFactor = (rbMean + 1e-6) / (wbG + 1e-6);
	const tint = clamp(((gFactor - 1) / 0.2) * 35, -45, 45);

	return {
		...defaultAdjustments(),
		sharpness: current.sharpness,
		exposure,
		contrast,
		highlights,
		shadows,
		whites,
		blacks,
		saturation,
		vibrance,
		temperature,
		tint,
	};
}
