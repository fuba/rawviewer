<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { onMount } from 'svelte';
	import { WebGLRenderer } from '../lib/renderer/webgl-renderer';

	let containerEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let renderer: WebGLRenderer | null = null;

	onMount(() => {
		renderer = new WebGLRenderer(canvasEl);
		resizeCanvas();

		const observer = new ResizeObserver(() => resizeCanvas());
		observer.observe(containerEl);

		return () => {
			observer.disconnect();
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

	// Re-render when image data or adjustments change
	$effect(() => {
		if (!renderer) return;
		const img = imageState.rawImage;
		const adj = imageState.adjustments;
		const curve = imageState.toneCurve;
		if (img) {
			renderer.uploadImage(img);
			renderer.render(adj, curve);
		}
	});
</script>

<div class="viewer-container" bind:this={containerEl}>
	{#if !imageState.rawImage && !imageState.loading}
		<div class="empty-state">
			<p>Open a RAW file to begin editing</p>
			<p class="hint">Supports CR2, NEF, ARW, DNG, and more</p>
		</div>
	{/if}
	<canvas bind:this={canvasEl}></canvas>
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
