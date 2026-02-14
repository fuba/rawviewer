<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { onMount } from 'svelte';
	import { WebGLRenderer } from '../lib/renderer/webgl-renderer';
	import { PanZoomController } from '../lib/renderer/pan-zoom';
	import { exportImage } from '../lib/exporter/exporter';
	import type { ExportOptions } from '../lib/types';

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let renderer: WebGLRenderer | null = null;
	let panZoom: PanZoomController | null = null;

	// Track whether image has been uploaded (avoid re-uploading on every adjustment)
	let uploadedImageRef: unknown = null;

	onMount(() => {
		renderer = new WebGLRenderer(canvasEl);
		panZoom = new PanZoomController(canvasEl, renderer);

		panZoom.onRender(() => {
			if (renderer && imageState.rawImage) {
				renderer.render(imageState.adjustments, imageState.toneCurve);
			}
		});

		resizeCanvas();

		const observer = new ResizeObserver(() => {
			resizeCanvas();
			if (renderer && imageState.rawImage) {
				renderer.render(imageState.adjustments, imageState.toneCurve);
			}
		});
		observer.observe(containerEl);

		// Listen for export events from App
		function handleExport(e: Event) {
			if (!renderer) return;
			const options = (e as CustomEvent<ExportOptions>).detail;
			exportImage(renderer, options).catch(err => {
				console.error('Export failed:', err);
				alert(`Export failed: ${err instanceof Error ? err.message : err}`);
			});
		}
		window.addEventListener('export-image', handleExport);

		return () => {
			window.removeEventListener('export-image', handleExport);
			observer.disconnect();
			panZoom?.dispose();
			renderer?.dispose();
		};
	});

	function resizeCanvas() {
		if (!containerEl || !canvasEl) return;
		const rect = containerEl.getBoundingClientRect();
		canvasEl.width = rect.width * devicePixelRatio;
		canvasEl.height = rect.height * devicePixelRatio;
		canvasEl.style.width = `${rect.width}px`;
		canvasEl.style.height = `${rect.height}px`;
		renderer?.setViewport(canvasEl.width, canvasEl.height);
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
		renderer.render(adj, curve);
	});
</script>

<div class="viewer-container" bind:this={containerEl}>
	{#if !imageState.rawImage && !imageState.loading}
		<div class="empty-state">
			<p>Open a RAW file to begin editing</p>
			<p class="hint">Supports CR2, NEF, ARW, DNG, and more</p>
		</div>
	{/if}
	<canvas bind:this={canvasEl} class:has-image={imageState.rawImage}></canvas>
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
