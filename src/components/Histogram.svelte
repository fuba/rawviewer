<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { onMount } from 'svelte';

	let canvasEl: HTMLCanvasElement;
	let containerEl: HTMLDivElement;

	onMount(() => {
		const observer = new ResizeObserver(() => drawHistogram());
		observer.observe(containerEl);
		return () => observer.disconnect();
	});

	// Re-draw histogram when image or adjustments change
	$effect(() => {
		// Track dependencies
		const _img = imageState.rawImage;
		const _adj = imageState.adjustments;
		if (_img) drawHistogram();
	});

	function drawHistogram() {
		const img = imageState.rawImage;
		if (!img || !canvasEl || !containerEl) return;

		const rect = containerEl.getBoundingClientRect();
		const w = Math.floor(rect.width);
		const h = Math.floor(rect.height);
		if (w === 0 || h === 0) return;

		canvasEl.width = w;
		canvasEl.height = h;

		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;

		// Compute histogram bins (256 per channel)
		const bins = {
			r: new Uint32Array(256),
			g: new Uint32Array(256),
			b: new Uint32Array(256),
		};

		const data = img.data;
		const channels = img.channels;
		const pixelCount = img.width * img.height;

		// Sample for performance if image is very large
		const step = pixelCount > 1_000_000 ? Math.ceil(pixelCount / 500_000) : 1;

		if (img.bitsPerSample === 16) {
			const u16 = data as Uint16Array;
			for (let i = 0; i < pixelCount; i += step) {
				const idx = i * channels;
				bins.r[u16[idx] >> 8]++;
				bins.g[u16[idx + 1] >> 8]++;
				bins.b[u16[idx + 2] >> 8]++;
			}
		} else {
			const u8 = data as Uint8Array;
			for (let i = 0; i < pixelCount; i += step) {
				const idx = i * channels;
				bins.r[u8[idx]]++;
				bins.g[u8[idx + 1]]++;
				bins.b[u8[idx + 2]]++;
			}
		}

		// Find max bin value for normalization
		let maxBin = 1;
		for (let i = 1; i < 255; i++) { // Skip pure black/white for better scaling
			maxBin = Math.max(maxBin, bins.r[i], bins.g[i], bins.b[i]);
		}

		// Draw
		ctx.clearRect(0, 0, w, h);

		const drawChannel = (binData: Uint32Array, color: string) => {
			ctx.beginPath();
			ctx.moveTo(0, h);

			for (let i = 0; i < 256; i++) {
				const x = (i / 255) * w;
				const barH = Math.min(1, binData[i] / maxBin) * h;
				ctx.lineTo(x, h - barH);
			}

			ctx.lineTo(w, h);
			ctx.closePath();
			ctx.fillStyle = color;
			ctx.fill();
		};

		ctx.globalCompositeOperation = 'screen';
		drawChannel(bins.r, 'rgba(255, 80, 80, 0.5)');
		drawChannel(bins.g, 'rgba(80, 255, 80, 0.5)');
		drawChannel(bins.b, 'rgba(80, 80, 255, 0.5)');

		// Draw luminance overlay
		ctx.globalCompositeOperation = 'source-over';
		const lumBins = new Uint32Array(256);
		for (let i = 0; i < 256; i++) {
			lumBins[i] = bins.r[i] + bins.g[i] + bins.b[i];
		}
		let maxLum = 1;
		for (let i = 1; i < 255; i++) {
			maxLum = Math.max(maxLum, lumBins[i]);
		}

		ctx.beginPath();
		ctx.moveTo(0, h);
		for (let i = 0; i < 256; i++) {
			const x = (i / 255) * w;
			const barH = Math.min(1, lumBins[i] / maxLum) * h;
			ctx.lineTo(x, h - barH);
		}
		ctx.lineTo(w, h);
		ctx.closePath();
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
		ctx.lineWidth = 1;
		ctx.stroke();
	}
</script>

<div class="histogram" bind:this={containerEl}>
	<canvas bind:this={canvasEl} class="histogram-canvas"></canvas>
</div>

<style>
	.histogram {
		width: 100%;
		height: 100%;
		padding: 8px;
	}

	.histogram-canvas {
		width: 100%;
		height: 100%;
		border-radius: 4px;
	}
</style>
