import type { RawImageData, AdjustmentParams, ToneCurve, CurvePoint, TransformParams } from '../types';
import type { IRenderer } from './renderer-interface';
import vertexSrc from './shaders/vertex.glsl?raw';
import fragmentSrc from './shaders/adjust.glsl?raw';
import { toRgba8 } from './pixel-convert';
import { getEffectiveAspect } from '../transform/geometry';

export class WebGLRenderer implements IRenderer {
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram | null = null;
	private imageTexture: WebGLTexture | null = null;
	private curveLUT: WebGLTexture | null = null;
	private vao: WebGLVertexArrayObject | null = null;

	// Uniform locations
	private uniforms: Record<string, WebGLUniformLocation | null> = {};

	// Current image dimensions
	private imageWidth = 0;
	private imageHeight = 0;
	private viewportWidth = 0;
	private viewportHeight = 0;

	// Pan & zoom state
	private panX = 0;
	private panY = 0;
	private zoom = 1;

	// Whether image has been uploaded
	private hasImage = false;
	private lastCurveSignature = '';

	constructor(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext('webgl2', {
			premultipliedAlpha: false,
			preserveDrawingBuffer: true, // Needed for export readPixels
		});
		if (!gl) {
			throw new Error('WebGL 2 is not supported');
		}
		this.gl = gl;
		this.init();
	}

	private init() {
		const gl = this.gl;

		// Compile shaders
		const vs = this.compileShader(gl.VERTEX_SHADER, vertexSrc);
		const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentSrc);
		if (!vs || !fs) return;

		// Link program
		this.program = gl.createProgram()!;
		gl.attachShader(this.program, vs);
		gl.attachShader(this.program, fs);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error('Program link error:', gl.getProgramInfoLog(this.program));
			return;
		}

		gl.deleteShader(vs);
		gl.deleteShader(fs);

		// Cache uniform locations
		const uniformNames = [
			'u_image', 'u_curveLUT',
			'u_exposure', 'u_temperature', 'u_tint',
			'u_contrast', 'u_highlights', 'u_shadows',
			'u_whites', 'u_blacks', 'u_saturation', 'u_vibrance',
			'u_sharpness', 'u_texelSize',
			'u_pan', 'u_zoom', 'u_viewportSize', 'u_imageSize', 'u_displayAspect',
			'u_rotationRad', 'u_cropOffset', 'u_cropScale', 'u_cropEnabled',
		];
		for (const name of uniformNames) {
			this.uniforms[name] = gl.getUniformLocation(this.program, name);
		}

		// Create VAO (no vertex buffers needed - we use gl_VertexID)
		this.vao = gl.createVertexArray();

		// Create image texture
		this.imageTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Create curve LUT texture (256 x 4, linear identity)
		this.curveLUT = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.curveLUT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		this.updateCurveLUT(null);
	}

	private compileShader(type: number, source: string): WebGLShader | null {
		const gl = this.gl;
		const shader = gl.createShader(type);
		if (!shader) return null;

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(
				`Shader compile error (${type === gl.VERTEX_SHADER ? 'vertex' : 'fragment'}):`,
				gl.getShaderInfoLog(shader)
			);
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	/**
	 * Upload decoded RAW image data as a texture.
	 */
	uploadImage(image: RawImageData) {
		const gl = this.gl;
		if (!this.imageTexture) return;

		this.imageWidth = image.width;
		this.imageHeight = image.height;

		gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);

		// Upload normalized RGBA8 to avoid large 16-bit float allocations on huge RAW files.
		const rgba = toRgba8(image);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA8,
			image.width, image.height, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, rgba
		);

		this.hasImage = true;
		// Reset pan/zoom when loading new image
		this.panX = 0;
		this.panY = 0;
		this.zoom = 1;
	}

	/**
	 * Update the tone curve LUT texture.
	 * 256 x 4 texture: rows = [Red, Green, Blue, RGB combined]
	 */
	updateCurveLUT(curve: ToneCurve | null) {
		const signature = this.buildCurveSignature(curve);
		if (signature === this.lastCurveSignature) {
			return;
		}
		const gl = this.gl;
		if (!this.curveLUT) return;

		const size = 256;
		const data = new Uint8Array(size * 4 * 4); // 256 wide, 4 rows, RGBA

		const interpolateCurve = (points: CurvePoint[], x: number): number => {
			if (points.length < 2) return x;

			// Find surrounding control points
			let i = 0;
			while (i < points.length - 1 && points[i + 1].x < x) i++;

			if (i >= points.length - 1) return points[points.length - 1].y;
			if (x <= points[0].x) return points[0].y;

			const p0 = points[i];
			const p1 = points[i + 1];
			const t = (x - p0.x) / (p1.x - p0.x);

			// Smoothstep interpolation for natural curve
			const st = t * t * (3 - 2 * t);
			return p0.y + (p1.y - p0.y) * st;
		};

		for (let x = 0; x < size; x++) {
			const normalized = x / 255;

			// Row 0: Red channel curve
			const r = curve ? interpolateCurve(curve.red, normalized) : normalized;
			// Row 1: Green channel curve
			const g = curve ? interpolateCurve(curve.green, normalized) : normalized;
			// Row 2: Blue channel curve
			const b = curve ? interpolateCurve(curve.blue, normalized) : normalized;
			// Row 3: RGB combined curve
			const rgb = curve ? interpolateCurve(curve.rgb, normalized) : normalized;

			// Row 0 (Red)
			const idx0 = (0 * size + x) * 4;
			data[idx0] = Math.round(Math.max(0, Math.min(1, r)) * 255);
			data[idx0 + 1] = 0;
			data[idx0 + 2] = 0;
			data[idx0 + 3] = 255;

			// Row 1 (Green)
			const idx1 = (1 * size + x) * 4;
			data[idx1] = 0;
			data[idx1 + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
			data[idx1 + 2] = 0;
			data[idx1 + 3] = 255;

			// Row 2 (Blue)
			const idx2 = (2 * size + x) * 4;
			data[idx2] = 0;
			data[idx2 + 1] = 0;
			data[idx2 + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
			data[idx2 + 3] = 255;

			// Row 3 (RGB combined)
			const idx3 = (3 * size + x) * 4;
			const rgbVal = Math.round(Math.max(0, Math.min(1, rgb)) * 255);
			data[idx3] = rgbVal;
			data[idx3 + 1] = rgbVal;
			data[idx3 + 2] = rgbVal;
			data[idx3 + 3] = 255;
		}

		gl.bindTexture(gl.TEXTURE_2D, this.curveLUT);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA8,
			size, 4, 0,
			gl.RGBA, gl.UNSIGNED_BYTE, data
		);
		this.lastCurveSignature = signature;
	}

	private buildCurveSignature(curve: ToneCurve | null): string {
		if (!curve) return 'null';
		const encode = (points: CurvePoint[]) => points.map((p) => `${p.x.toFixed(5)},${p.y.toFixed(5)}`).join(';');
		return [
			encode(curve.rgb),
			encode(curve.red),
			encode(curve.green),
			encode(curve.blue),
		].join('|');
	}

	/**
	 * Render the image with current adjustments.
	 */
	render(params: AdjustmentParams, curve: ToneCurve, transform: TransformParams) {
		const gl = this.gl;
		if (!this.program || !this.hasImage) return;

		this.updateCurveLUT(curve);

		gl.viewport(0, 0, this.viewportWidth, this.viewportHeight);
		gl.clearColor(0.1, 0.1, 0.1, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.useProgram(this.program);

		// Bind textures
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);
		gl.uniform1i(this.uniforms['u_image']!, 0);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.curveLUT);
		gl.uniform1i(this.uniforms['u_curveLUT']!, 1);

		// Set adjustment uniforms
		gl.uniform1f(this.uniforms['u_exposure']!, params.exposure);
		gl.uniform1f(this.uniforms['u_temperature']!, params.temperature);
		gl.uniform1f(this.uniforms['u_tint']!, params.tint);
		gl.uniform1f(this.uniforms['u_contrast']!, params.contrast);
		gl.uniform1f(this.uniforms['u_highlights']!, params.highlights);
		gl.uniform1f(this.uniforms['u_shadows']!, params.shadows);
		gl.uniform1f(this.uniforms['u_whites']!, params.whites);
		gl.uniform1f(this.uniforms['u_blacks']!, params.blacks);
		gl.uniform1f(this.uniforms['u_saturation']!, params.saturation);
		gl.uniform1f(this.uniforms['u_vibrance']!, params.vibrance);
		gl.uniform1f(this.uniforms['u_sharpness']!, params.sharpness);
		gl.uniform2f(this.uniforms['u_texelSize']!, 1.0 / this.imageWidth, 1.0 / this.imageHeight);

		// Set transform uniforms
		gl.uniform2f(this.uniforms['u_pan']!, this.panX, this.panY);
		gl.uniform1f(this.uniforms['u_zoom']!, this.zoom);
		gl.uniform2f(this.uniforms['u_viewportSize']!, this.viewportWidth, this.viewportHeight);
		gl.uniform2f(this.uniforms['u_imageSize']!, this.imageWidth, this.imageHeight);
		gl.uniform1f(this.uniforms['u_displayAspect']!, getEffectiveAspect(this.imageWidth, this.imageHeight, transform));

		const rotationRad = (transform.rotationDeg * Math.PI) / 180;
		gl.uniform1f(this.uniforms['u_rotationRad']!, rotationRad);

		const crop = transform.cropApplied && transform.cropRect ? transform.cropRect : null;
		if (crop) {
			gl.uniform1i(this.uniforms['u_cropEnabled']!, 1);
			gl.uniform2f(this.uniforms['u_cropOffset']!, crop.x, crop.y);
			gl.uniform2f(this.uniforms['u_cropScale']!, crop.width, crop.height);
		} else {
			gl.uniform1i(this.uniforms['u_cropEnabled']!, 0);
			gl.uniform2f(this.uniforms['u_cropOffset']!, 0, 0);
			gl.uniform2f(this.uniforms['u_cropScale']!, 1, 1);
		}

		// Draw fullscreen quad
		gl.bindVertexArray(this.vao);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindVertexArray(null);
	}

	/**
	 * Update viewport size.
	 */
	setViewport(width: number, height: number) {
		this.viewportWidth = width;
		this.viewportHeight = height;
	}

	/**
	 * Set pan offset (normalized device coordinates).
	 */
	setPan(x: number, y: number) {
		this.panX = x;
		this.panY = y;
	}

	/**
	 * Set zoom level.
	 */
	setZoom(z: number) {
		this.zoom = Math.max(0.1, Math.min(20, z));
	}

	getPan() { return { x: this.panX, y: this.panY }; }
	getZoom() { return this.zoom; }

	/**
	 * Read rendered pixels for export.
	 */
	readPixels(): Uint8Array {
		const gl = this.gl;
		const pixels = new Uint8Array(this.viewportWidth * this.viewportHeight * 4);
		gl.readPixels(0, 0, this.viewportWidth, this.viewportHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		return pixels;
	}

	/**
	 * Get the canvas element.
	 */
	getCanvas(): HTMLCanvasElement {
		return this.gl.canvas as HTMLCanvasElement;
	}

	dispose() {
		const gl = this.gl;
		if (this.program) gl.deleteProgram(this.program);
		if (this.imageTexture) gl.deleteTexture(this.imageTexture);
		if (this.curveLUT) gl.deleteTexture(this.curveLUT);
		if (this.vao) gl.deleteVertexArray(this.vao);
	}
}
