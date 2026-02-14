<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';

	function formatShutter(s: number): string {
		if (s <= 0) return '—';
		if (s >= 1) return `${s.toFixed(1)}s`;
		return `1/${Math.round(1 / s)}s`;
	}

	function formatAperture(a: number): string {
		if (a <= 0) return '—';
		return `f/${a.toFixed(1)}`;
	}

	function formatFocal(f: number): string {
		if (f <= 0) return '—';
		return `${f.toFixed(0)}mm`;
	}

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
</script>

<div class="metadata-panel">
	<div class="panel-header">
		<span>Image Info</span>
		<button class="close-btn" onclick={onclose}>✕</button>
	</div>

	{#if imageState.metadata}
		{@const m = imageState.metadata}
		<div class="meta-section">
			<div class="meta-row">
				<span class="meta-label">Camera</span>
				<span class="meta-value">{m.make} {m.model}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Dimensions</span>
				<span class="meta-value">{m.width} × {m.height}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">ISO</span>
				<span class="meta-value">{m.iso || '—'}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Shutter</span>
				<span class="meta-value">{formatShutter(m.shutter)}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Aperture</span>
				<span class="meta-value">{formatAperture(m.aperture)}</span>
			</div>
			<div class="meta-row">
				<span class="meta-label">Focal Length</span>
				<span class="meta-value">{formatFocal(m.focalLength)}</span>
			</div>
			{#if m.artist}
				<div class="meta-row">
					<span class="meta-label">Artist</span>
					<span class="meta-value">{m.artist}</span>
				</div>
			{/if}
			{#if m.description}
				<div class="meta-row">
					<span class="meta-label">Description</span>
					<span class="meta-value">{m.description}</span>
				</div>
			{/if}
		</div>
	{:else}
		<p class="no-data">No image loaded</p>
	{/if}
</div>

<style>
	.metadata-panel {
		position: fixed;
		top: 60px;
		right: calc(var(--panel-width) + 16px);
		width: 280px;
		background: var(--bg-panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 16px;
		z-index: 50;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		font-weight: 600;
		font-size: 14px;
	}

	.close-btn {
		background: transparent;
		padding: 2px 6px;
		font-size: 14px;
		color: var(--text-secondary);
	}

	.close-btn:hover {
		color: var(--text-primary);
		background: transparent;
	}

	.meta-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.meta-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.meta-label {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.meta-value {
		font-size: 12px;
		color: var(--text-primary);
		text-align: right;
	}

	.no-data {
		color: var(--text-secondary);
		font-size: 12px;
	}
</style>
