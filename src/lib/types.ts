// Decoded RAW image data
export interface RawImageData {
	width: number;
	height: number;
	data: Uint8Array | Uint16Array;
	bitsPerSample: 8 | 16;
	channels: number;
}

// EXIF / image metadata
export interface ImageMetadata {
	make: string;
	model: string;
	iso: number;
	shutter: number;
	aperture: number;
	focalLength: number;
	width: number;
	height: number;
	description: string;
	artist: string;
}

// All color adjustment parameters
export interface AdjustmentParams {
	exposure: number;       // EV, range: -5 to +5, default: 0
	temperature: number;    // Color temperature offset, range: -100 to +100, default: 0
	tint: number;           // Green-magenta tint, range: -100 to +100, default: 0
	contrast: number;       // range: -100 to +100, default: 0
	highlights: number;     // range: -100 to +100, default: 0
	shadows: number;        // range: -100 to +100, default: 0
	whites: number;         // range: -100 to +100, default: 0
	blacks: number;         // range: -100 to +100, default: 0
	saturation: number;     // range: -100 to +100, default: 0
	vibrance: number;       // range: -100 to +100, default: 0
	sharpness: number;      // range: 0 to 100, default: 0
}

export interface CropRect {
	x: number;      // 0-1
	y: number;      // 0-1
	width: number;  // 0-1
	height: number; // 0-1
}

export type CropAspectPreset = 'free' | '1:1' | '4:3' | '3:2' | '16:9';

export interface TransformParams {
	rotationDeg: number;
	cropRect: CropRect | null;
	cropApplied: boolean;
	cropAspectPreset: CropAspectPreset;
}

// Tone curve control point
export interface CurvePoint {
	x: number; // 0-1
	y: number; // 0-1
}

// Tone curve per channel
export interface ToneCurve {
	rgb: CurvePoint[];
	red: CurvePoint[];
	green: CurvePoint[];
	blue: CurvePoint[];
}

// Export format options
export type ExportFormat = 'jpeg' | 'png' | 'tiff';

export interface ExportOptions {
	format: ExportFormat;
	quality: number;   // 0-100 (JPEG only)
	filename: string;
	targetWidth: number;
	targetHeight: number;
	upscale: boolean;
}

export type RenderBackend = 'webgl' | 'canvas2d' | null;

export type TaskKind = 'open' | 'export' | null;

// Decode worker messages
export interface DecodeRequest {
	type: 'decode';
	id: number;
	buffer: ArrayBuffer;
	outputBps: 8 | 16;
}

export interface DecodeResponse {
	type: 'decoded';
	id: number;
	image: RawImageData;
	metadata: ImageMetadata;
}

export interface DecodeErrorResponse {
	type: 'error';
	id: number;
	message: string;
}

export type WorkerResponse = DecodeResponse | DecodeErrorResponse;

// Default adjustment parameters
export function defaultAdjustments(): AdjustmentParams {
	return {
		exposure: 0,
		temperature: 0,
		tint: 0,
		contrast: 0,
		highlights: 0,
		shadows: 0,
		whites: 0,
		blacks: 0,
		saturation: 0,
		vibrance: 0,
		sharpness: 0,
	};
}

export function defaultTransform(): TransformParams {
	return {
		rotationDeg: 0,
		cropRect: null,
		cropApplied: false,
		cropAspectPreset: 'free',
	};
}

// Default tone curve (linear)
export function defaultToneCurve(): ToneCurve {
	return {
		rgb: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
		red: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
		green: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
		blue: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
	};
}
