import type { IRenderer } from './renderer-interface';
import { WebGLRenderer } from './webgl-renderer';
import { Canvas2DRenderer } from './canvas2d-renderer';

/**
 * Create the best available renderer for the given canvas.
 * Tries WebGL 2 first, falls back to Canvas 2D.
 */
export function createRenderer(canvas: HTMLCanvasElement): IRenderer {
	try {
		return new WebGLRenderer(canvas);
	} catch {
		console.warn('WebGL 2 not available, falling back to Canvas 2D renderer');
		return new Canvas2DRenderer(canvas);
	}
}
