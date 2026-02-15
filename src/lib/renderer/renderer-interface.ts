import type { RawImageData, AdjustmentParams, ToneCurve, TransformParams } from '../types';

/**
 * Common renderer interface shared by WebGL and Canvas2D renderers.
 */
export interface IRenderer {
	uploadImage(image: RawImageData): void;
	render(params: AdjustmentParams, curve: ToneCurve, transform: TransformParams): void;
	setViewport(width: number, height: number): void;
	setPan(x: number, y: number): void;
	setZoom(z: number): void;
	getPan(): { x: number; y: number };
	getZoom(): number;
	readPixels(): Uint8Array;
	getCanvas(): HTMLCanvasElement;
	dispose(): void;
}
