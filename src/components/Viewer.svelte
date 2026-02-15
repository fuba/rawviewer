<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { onMount } from 'svelte';
	import { createRenderer } from '../lib/renderer/create-renderer';
	import type { IRenderer } from '../lib/renderer/renderer-interface';
	import { PanZoomController } from '../lib/renderer/pan-zoom';
	import { exportCanvasImage, exportImage, exportPixels } from '../lib/exporter/exporter';
	import CropOverlay from './CropOverlay.svelte';
	import type { CropRect, ExportOptions, TransformParams } from '../lib/types';
	import { getEffectiveImageSize, getRotatedBounds } from '../lib/transform/geometry';
	import { resolveExportSize } from '../lib/exporter/size';
	import { decodeRawFile, type DecodeProgress } from '../lib/raw-decoder/decoder';
	import { resolvePreviewPixelRatio } from '../lib/renderer/preview-quality';
	import { Canvas2DRenderer } from '../lib/renderer/canvas2d-renderer';

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let renderer: IRenderer | null = null;
	let panZoom: PanZoomController | null = null;
	let viewPan = $state({ x: 0, y: 0 });
	let viewZoom = $state(1);
	let cropImageRect = $state<{ x: number; y: number; width: number; height: number } | null>(null);
	let previewInteractive = $state(false);
	let previewIdleTimer: ReturnType<typeof setTimeout> | null = null;
	let paramRenderTimer: ReturnType<typeof setTimeout> | null = null;
	let lastRenderedParamSignature = '';
	const PARAM_RENDER_IDLE_MS = 1000;
	const EXPORT_DECODE_WEIGHT = 0.72;

	// Track whether image has been uploaded (avoid re-uploading on every adjustment)
	let uploadedImageRef: unknown = null;

	function getRenderTransform(): TransformParams {
		const transform = imageState.transform;
		if (imageState.cropMode) {
			return {
				...transform,
				cropApplied: false,
				cropRect: null,
			};
		}
		return transform;
	}

	function syncViewState() {
		if (!renderer) return;
		viewPan = renderer.getPan();
		viewZoom = renderer.getZoom();
		updateCropImageRect();
	}

	function renderCurrent() {
		if (!renderer || !imageState.rawImage) return;
		renderer.render(imageState.adjustments, imageState.toneCurve, getRenderTransform());
		lastRenderedParamSignature = buildParamSignature();
		syncViewState();
	}

	function buildParamSignature(): string {
		return JSON.stringify({
			adjustments: imageState.adjustments,
			toneCurve: imageState.toneCurve,
			transform: imageState.transform,
			cropMode: imageState.cropMode,
			draftCropRect: imageState.draftCropRect,
		});
	}

	function scheduleParamRender() {
		if (!renderer || !imageState.rawImage) return;
		const signature = buildParamSignature();
		if (paramRenderTimer) clearTimeout(paramRenderTimer);
		paramRenderTimer = setTimeout(() => {
			paramRenderTimer = null;
			if (!renderer || !imageState.rawImage) return;
			if (signature === lastRenderedParamSignature) return;
			renderCurrent();
		}, PARAM_RENDER_IDLE_MS);
	}

	onMount(() => {
		renderer = createRenderer(canvasEl);
		imageState.renderBackend = renderer instanceof Canvas2DRenderer ? 'canvas2d' : 'webgl';
		panZoom = new PanZoomController(canvasEl, renderer);

		panZoom.onRender(() => {
			setPreviewInteractive(true);
			renderCurrent();
		});

		resizeCanvas();

		const observer = new ResizeObserver(() => {
			resizeCanvas();
			renderCurrent();
		});
		observer.observe(containerEl);

		// Listen for export events from App
		function handleExport(e: Event) {
			if (!renderer) return;
			const options = (e as CustomEvent<ExportOptions>).detail;
			exportCurrentState(renderer, options).catch(err => {
				console.error('Export failed:', err);
				alert(`Export failed: ${err instanceof Error ? err.message : err}`);
			});
		}
			window.addEventListener('export-image', handleExport);

			return () => {
				if (previewIdleTimer) clearTimeout(previewIdleTimer);
				if (paramRenderTimer) clearTimeout(paramRenderTimer);
				window.removeEventListener('export-image', handleExport);
				observer.disconnect();
				panZoom?.dispose();
				renderer?.dispose();
				imageState.renderBackend = null;
			};
		});

	function setPreviewInteractive(active: boolean) {
		if (active) {
			if (!previewInteractive) {
				previewInteractive = true;
				resizeCanvas();
			}
			if (previewIdleTimer) clearTimeout(previewIdleTimer);
			previewIdleTimer = setTimeout(() => {
				previewInteractive = false;
				resizeCanvas();
				renderCurrent();
			}, 140);
			return;
		}

		if (previewInteractive) {
			previewInteractive = false;
			resizeCanvas();
		}
	}

	function resizeCanvas() {
		if (!containerEl || !canvasEl) return;
		const rect = containerEl.getBoundingClientRect();
		const renderDpr = resolvePreviewPixelRatio(devicePixelRatio, previewInteractive);
		canvasEl.width = Math.max(1, Math.round(rect.width * renderDpr));
		canvasEl.height = Math.max(1, Math.round(rect.height * renderDpr));
		canvasEl.style.width = `${rect.width}px`;
		canvasEl.style.height = `${rect.height}px`;
		renderer?.setViewport(canvasEl.width, canvasEl.height);
		updateCropImageRect();
	}

	function updateCropImageRect() {
		if (!containerEl || !imageState.rawImage) {
			cropImageRect = null;
			return;
		}

		const rect = containerEl.getBoundingClientRect();
		const vw = rect.width;
		const vh = rect.height;
		if (vw <= 0 || vh <= 0) {
			cropImageRect = null;
			return;
		}

		const raw = imageState.rawImage;
		const rotated = getRotatedBounds(raw.width, raw.height, imageState.transform.rotationDeg);
		const imageAspect = rotated.height > 0 ? rotated.width / rotated.height : 1;
		const viewportAspect = vw / vh;

		let fitW = vw;
		let fitH = vh;
		if (imageAspect > viewportAspect) {
			fitH = vw / imageAspect;
		} else {
			fitW = vh * imageAspect;
		}

		const drawW = fitW * viewZoom;
		const drawH = fitH * viewZoom;
		const cx = vw / 2 + viewPan.x * vw / 2;
		const cy = vh / 2 - viewPan.y * vh / 2;

		cropImageRect = {
			x: cx - drawW / 2,
			y: cy - drawH / 2,
			width: drawW,
			height: drawH,
		};
	}

	function currentDraftCrop(): CropRect {
		return imageState.draftCropRect
			?? imageState.transform.cropRect
			?? { x: 0, y: 0, width: 1, height: 1 };
	}

	function exportDecodeMessage(progress: DecodeProgress): string {
		switch (progress.phase) {
			case 'upload':
				return 'Uploading source RAW...';
			case 'processing':
				return 'Decoding full resolution...';
			case 'download':
				return 'Receiving full image...';
			case 'done':
				return 'Full decode ready';
			default:
				return 'Preparing export...';
		}
	}

	async function exportCurrentState(activeRenderer: IRenderer, options: ExportOptions): Promise<void> {
		const sourceBuffer = imageState.sourceBuffer;
		imageState.beginTask('export', 'Preparing export...');
		try {
			if (!sourceBuffer) {
				imageState.updateTask(0.22, 'Reading preview pixels...');
				await exportImage(activeRenderer, options);
				imageState.updateTask(1, 'Export complete');
				return;
			}

			imageState.updateTask(0.03, 'Starting full decode...');
			const full = await decodeRawFile(sourceBuffer, imageState.filename, {
				onProgress: (progress) => {
					imageState.updateTask(
						progress.value * EXPORT_DECODE_WEIGHT,
						exportDecodeMessage(progress)
					);
				},
			});
			const effective = getEffectiveImageSize(full.image.width, full.image.height, imageState.transform);
			const outSize = resolveExportSize(
				effective.width,
				effective.height,
				options.targetWidth,
				options.targetHeight,
				options.upscale
			);

			const exportCanvas = document.createElement('canvas');
			exportCanvas.width = outSize.width;
			exportCanvas.height = outSize.height;
			const exportRenderer = createRenderer(exportCanvas);
			try {
				imageState.updateTask(0.8, 'Rendering export image...');
				exportRenderer.setViewport(outSize.width, outSize.height);
				exportRenderer.uploadImage(full.image);
				exportRenderer.setPan(0, 0);
				exportRenderer.setZoom(1);
				exportRenderer.render(imageState.adjustments, imageState.toneCurve, imageState.transform);
				if (options.format === 'tiff') {
					imageState.updateTask(0.9, 'Encoding TIFF...');
					const pixels = exportRenderer.readPixels();
					await exportPixels(pixels, outSize.width, outSize.height, options);
				} else {
					imageState.updateTask(0.9, 'Encoding image...');
					await exportCanvasImage(exportCanvas, options);
				}
				imageState.updateTask(1, 'Export complete');
			} finally {
				exportRenderer.dispose();
			}
		} finally {
			imageState.finishTask();
		}
	}

	// Upload image when rawImage changes
	$effect(() => {
		if (!renderer) return;
		const img = imageState.rawImage;
		if (img && img !== uploadedImageRef) {
			renderer.uploadImage(img);
			uploadedImageRef = img;
			panZoom?.resetView();
		}
	});

	// Re-render when adjustments or tone curve change
	$effect(() => {
		if (!renderer || !imageState.rawImage) return;
		const adj = imageState.adjustments;
		const curve = imageState.toneCurve;
		const transform = imageState.transform;
		const cropMode = imageState.cropMode;
		const draftCrop = imageState.draftCropRect;
		void transform;
		void cropMode;
		void adj;
		void curve;
		void draftCrop;
		scheduleParamRender();
	});

	$effect(() => {
		if (!imageState.cropMode) return;
		if (imageState.draftCropRect) return;
		imageState.draftCropRect = imageState.transform.cropRect ?? { x: 0, y: 0, width: 1, height: 1 };
	});
</script>

<div class="viewer-container" bind:this={containerEl}>
	{#if !imageState.rawImage && !imageState.loading}
		<div class="empty-state">
			<p>Open a RAW file to begin editing</p>
			<p class="hint">Supports CR2, NEF, ARW, DNG, and more</p>
		</div>
	{/if}
	<canvas bind:this={canvasEl} class:has-image={imageState.rawImage && !imageState.cropMode}></canvas>
	{#if imageState.rawImage && imageState.cropMode && cropImageRect}
		<CropOverlay
			imageRect={cropImageRect}
			cropRect={currentDraftCrop()}
			aspectPreset={imageState.transform.cropAspectPreset}
			onchange={(rect: CropRect) => {
				imageState.draftCropRect = rect;
			}}
		/>
	{/if}
</div>

<style>
	.viewer-container {
		flex: 1;
		position: relative;
		overflow: hidden;
		background: var(--bg-primary);
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
	}

	canvas.has-image {
		cursor: grab;
	}

	canvas.has-image:active {
		cursor: grabbing;
	}

	.empty-state {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-secondary);
		gap: 8px;
	}

	.hint {
		font-size: 12px;
		opacity: 0.6;
	}
</style>
