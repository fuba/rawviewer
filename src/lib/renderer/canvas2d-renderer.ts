import type { RawImageData, AdjustmentParams, ToneCurve, CurvePoint } from '../types';
import type { IRenderer } from './renderer-interface';

/**
 * Canvas 2D fallback renderer for environments without WebGL 2.
 * Applies color adjustments on the CPU.
 */
export class Canvas2DRenderer implements IRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;

	private imageData: RawImageData | null = null;
	private viewportWidth = 0;
	private viewportHeight = 0;
	private panX = 0;
	private panY = 0;
	private zoom = 1;

	// Cache: normalized float RGB array from the source image
	private srcPixels: Float32Array | null = null;

	constructor(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Canvas 2D is not supported');
		}
		this.canvas = canvas;
		this.ctx = ctx;
	}

	uploadImage(image: RawImageData) {
		this.imageData = image;

		// Pre-convert to normalized float [0,1] RGB
		const count = image.width * image.height;
		this.srcPixels = new Float32Array(count * 3);
		const src = image.data;
		const scale = image.bitsPerSample === 16 ? 1 / 65535 : 1 / 255;

		for (let i = 0; i < count; i++) {
			const si = i * image.channels;
			const di = i * 3;
			this.srcPixels[di] = src[si] * scale;
			this.srcPixels[di + 1] = src[si + 1] * scale;
			this.srcPixels[di + 2] = src[si + 2] * scale;
		}

		this.panX = 0;
		this.panY = 0;
		this.zoom = 1;
	}

	render(params: AdjustmentParams, curve: ToneCurve) {
		if (!this.imageData || !this.srcPixels) return;

		const img = this.imageData;
		const src = this.srcPixels;
		const w = img.width;
		const h = img.height;

		// Build curve LUTs (256 entries each)
		const curveLutR = buildCurveLUT(curve.red);
		const curveLutG = buildCurveLUT(curve.green);
		const curveLutB = buildCurveLUT(curve.blue);
		const curveLutRGB = buildCurveLUT(curve.rgb);

		// Create output ImageData at image resolution
		const out = this.ctx.createImageData(w, h);
		const dst = out.data;

		const exposureMul = Math.pow(2, params.exposure);
		const tempFactor = params.temperature / 100 * 0.3;
		const tintFactor = params.tint / 100 * 0.2;
		const contrastFactor = params.contrast / 100;
		const satFactor = 1 + params.saturation / 100;
		const vibAmount = params.vibrance / 100;
		const highlightAmt = params.highlights / 100;
		const shadowAmt = params.shadows / 100;
		const whiteAmt = params.whites / 100;
		const blackAmt = params.blacks / 100;

		for (let i = 0; i < w * h; i++) {
			const si = i * 3;
			let r = src[si];
			let g = src[si + 1];
			let b = src[si + 2];

			// Exposure (linear)
			r *= exposureMul;
			g *= exposureMul;
			b *= exposureMul;

			// White balance
			r *= 1 + tempFactor;
			b *= 1 - tempFactor;
			g *= 1 + tintFactor;

			// Clamp before gamma
			r = Math.max(0, r);
			g = Math.max(0, g);
			b = Math.max(0, b);

			// Linear to sRGB
			r = linearToSrgb(r);
			g = linearToSrgb(g);
			b = linearToSrgb(b);

			// Contrast
			if (Math.abs(contrastFactor) > 0.005) {
				r = 0.5 + (r - 0.5) * (1 + contrastFactor);
				g = 0.5 + (g - 0.5) * (1 + contrastFactor);
				b = 0.5 + (b - 0.5) * (1 + contrastFactor);
			}

			// Highlights / Shadows / Whites / Blacks
			const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

			if (Math.abs(highlightAmt) > 0.005) {
				const mask = smoothstep(0.5, 1.0, lum);
				const adj = -highlightAmt * mask;
				r += (r - r * mask) * adj;
				g += (g - g * mask) * adj;
				b += (b - b * mask) * adj;
			}
			if (Math.abs(shadowAmt) > 0.005) {
				const mask = 1 - smoothstep(0, 0.5, lum);
				r += mask * shadowAmt * 0.3;
				g += mask * shadowAmt * 0.3;
				b += mask * shadowAmt * 0.3;
			}
			if (Math.abs(whiteAmt) > 0.005) {
				const mask = smoothstep(0.7, 1.0, lum);
				r += mask * whiteAmt * 0.2;
				g += mask * whiteAmt * 0.2;
				b += mask * whiteAmt * 0.2;
			}
			if (Math.abs(blackAmt) > 0.005) {
				const mask = 1 - smoothstep(0, 0.3, lum);
				r += mask * blackAmt * 0.2;
				g += mask * blackAmt * 0.2;
				b += mask * blackAmt * 0.2;
			}

			// Tone curve
			r = clamp01(r);
			g = clamp01(g);
			b = clamp01(b);
			r = curveLutR[Math.round(r * 255)] / 255;
			g = curveLutG[Math.round(g * 255)] / 255;
			b = curveLutB[Math.round(b * 255)] / 255;
			r = curveLutRGB[Math.round(r * 255)] / 255;
			g = curveLutRGB[Math.round(g * 255)] / 255;
			b = curveLutRGB[Math.round(b * 255)] / 255;

			// Saturation
			if (Math.abs(satFactor - 1) > 0.005) {
				const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				r = l + (r - l) * satFactor;
				g = l + (g - l) * satFactor;
				b = l + (b - l) * satFactor;
			}

			// Vibrance
			if (Math.abs(vibAmount) > 0.005) {
				const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				const sat = Math.sqrt((r - l) * (r - l) + (g - l) * (g - l) + (b - l) * (b - l));
				let boost = 1 + vibAmount * (1 - sat * 2);
				boost = Math.max(boost, 0.5);
				r = l + (r - l) * boost;
				g = l + (g - l) * boost;
				b = l + (b - l) * boost;
			}

			const di = i * 4;
			dst[di] = clamp255(r);
			dst[di + 1] = clamp255(g);
			dst[di + 2] = clamp255(b);
			dst[di + 3] = 255;
		}

		// Draw the image with pan/zoom
		this.ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);

		// Create a temporary canvas at image resolution
		const tmpCanvas = new OffscreenCanvas(w, h);
		const tmpCtx = tmpCanvas.getContext('2d')!;
		tmpCtx.putImageData(out, 0, 0);

		// Calculate fit-to-viewport scale
		const aspectViewport = this.viewportWidth / this.viewportHeight;
		const aspectImage = w / h;
		let fitScale: number;
		if (aspectImage > aspectViewport) {
			fitScale = this.viewportWidth / w;
		} else {
			fitScale = this.viewportHeight / h;
		}

		const scale = fitScale * this.zoom;
		const drawW = w * scale;
		const drawH = h * scale;
		const cx = this.viewportWidth / 2 + this.panX * this.viewportWidth / 2;
		const cy = this.viewportHeight / 2 - this.panY * this.viewportHeight / 2;

		this.ctx.drawImage(tmpCanvas, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
	}

	setViewport(width: number, height: number) {
		this.viewportWidth = width;
		this.viewportHeight = height;
	}

	setPan(x: number, y: number) { this.panX = x; this.panY = y; }
	setZoom(z: number) { this.zoom = Math.max(0.1, Math.min(20, z)); }
	getPan() { return { x: this.panX, y: this.panY }; }
	getZoom() { return this.zoom; }

	readPixels(): Uint8Array {
		const imgData = this.ctx.getImageData(0, 0, this.viewportWidth, this.viewportHeight);
		// Flip vertically to match WebGL convention
		const w = this.viewportWidth;
		const h = this.viewportHeight;
		const flipped = new Uint8Array(w * h * 4);
		for (let y = 0; y < h; y++) {
			const srcRow = y * w * 4;
			const dstRow = (h - 1 - y) * w * 4;
			flipped.set(imgData.data.subarray(srcRow, srcRow + w * 4), dstRow);
		}
		return flipped;
	}

	getCanvas() { return this.canvas; }
	dispose() {}
}

// Utility functions

function linearToSrgb(c: number): number {
	if (c <= 0.0031308) return c * 12.92;
	return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp255(v: number): number {
	const i = Math.round(v * 255);
	return i < 0 ? 0 : i > 255 ? 255 : i;
}

function buildCurveLUT(points: CurvePoint[]): Uint8Array {
	const lut = new Uint8Array(256);
	for (let i = 0; i < 256; i++) {
		const x = i / 255;
		lut[i] = Math.round(clamp01(interpolateCurve(points, x)) * 255);
	}
	return lut;
}

function interpolateCurve(points: CurvePoint[], x: number): number {
	if (points.length < 2) return x;
	if (x <= points[0].x) return points[0].y;

	let i = 0;
	while (i < points.length - 1 && points[i + 1].x < x) i++;
	if (i >= points.length - 1) return points[points.length - 1].y;

	const p0 = points[i];
	const p1 = points[i + 1];
	const t = (x - p0.x) / (p1.x - p0.x);
	const st = t * t * (3 - 2 * t); // smoothstep
	return p0.y + (p1.y - p0.y) * st;
}
