<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { getEffectiveImageSize } from '../lib/transform/geometry';
	import type { ExportFormat, ExportOptions } from '../lib/types';

	interface Props {
		filename: string;
		onexport: (options: ExportOptions) => void;
		onclose: () => void;
	}

	let { filename, onexport, onclose }: Props = $props();

	let format: ExportFormat = $state('jpeg');
	let quality: number = $state(92);
	let keepAspect: boolean = $state(true);
	let upscale: boolean = $state(false);
	let sourceWidth: number = $state(1);
	let sourceHeight: number = $state(1);
	let targetWidth: number = $state(1);
	let targetHeight: number = $state(1);
	let initialized = $state(false);

	function clampInt(value: number): number {
		if (!Number.isFinite(value)) return 1;
		return Math.max(1, Math.round(value));
	}

	function baseName(name: string): string {
		const dot = name.lastIndexOf('.');
		return dot > 0 ? name.substring(0, dot) : name;
	}

	function aspectRatio(): number {
		return sourceHeight > 0 ? sourceWidth / sourceHeight : 1;
	}

	$effect(() => {
		const raw = imageState.rawImage;
		const meta = imageState.metadata;
		const transform = imageState.transform;
		if (!raw) return;
		const baseWidth = meta?.width && meta.width > 0 ? meta.width : raw.width;
		const baseHeight = meta?.height && meta.height > 0 ? meta.height : raw.height;
		const effective = getEffectiveImageSize(baseWidth, baseHeight, transform);
		sourceWidth = clampInt(effective.width);
		sourceHeight = clampInt(effective.height);
		if (!initialized) {
			targetWidth = sourceWidth;
			targetHeight = sourceHeight;
			initialized = true;
		}
	});

	function onTargetWidthInput(value: number) {
		targetWidth = clampInt(value);
		if (keepAspect) {
			targetHeight = clampInt(targetWidth / aspectRatio());
		}
	}

	function onTargetHeightInput(value: number) {
		targetHeight = clampInt(value);
		if (keepAspect) {
			targetWidth = clampInt(targetHeight * aspectRatio());
		}
	}

	function handleExport() {
		onexport({
			format,
			quality,
			filename: baseName(filename),
			targetWidth: clampInt(targetWidth),
			targetHeight: clampInt(targetHeight),
			upscale,
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter') handleExport();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="overlay" onkeydown={handleKeydown} onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="dialog" onclick={(e: MouseEvent) => e.stopPropagation()}>
		<h3>Export Image</h3>

		<div class="field">
			<label for="export-format">Format</label>
			<select id="export-format" bind:value={format}>
				<option value="jpeg">JPEG</option>
				<option value="png">PNG</option>
				<option value="tiff">TIFF</option>
			</select>
		</div>

		{#if format === 'jpeg'}
			<div class="field">
				<label for="export-quality">Quality: {quality}%</label>
				<input
					type="range"
					id="export-quality"
					min="1"
					max="100"
					bind:value={quality}
				/>
			</div>
		{/if}

		<div class="field">
			<div class="field-label">Source Size</div>
			<div class="source-size">{sourceWidth} × {sourceHeight}</div>
		</div>

		<div class="field size-field">
			<label for="target-width">Target Size</label>
			<div class="size-row">
				<input
					id="target-width"
					type="number"
					min="1"
					value={targetWidth}
					oninput={(e: Event) => {
						onTargetWidthInput(parseInt((e.target as HTMLInputElement).value, 10));
					}}
				/>
				<span class="multiply">×</span>
				<input
					id="target-height"
					type="number"
					min="1"
					value={targetHeight}
					oninput={(e: Event) => {
						onTargetHeightInput(parseInt((e.target as HTMLInputElement).value, 10));
					}}
				/>
			</div>
		</div>

		<div class="field option-row">
			<label>
				<input
					type="checkbox"
					checked={keepAspect}
					onchange={(e: Event) => {
						const checked = (e.target as HTMLInputElement).checked;
						keepAspect = checked;
						if (checked) {
							targetHeight = clampInt(targetWidth / aspectRatio());
						}
					}}
				/>
				Keep aspect ratio
			</label>
		</div>

		<div class="field option-row">
			<label>
				<input
					type="checkbox"
					checked={upscale}
					onchange={(e: Event) => {
						upscale = (e.target as HTMLInputElement).checked;
					}}
				/>
				Allow upscaling
			</label>
		</div>

		<div class="field">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label>Output filename</label>
			<span class="filename-preview">{baseName(filename)}.{format === 'jpeg' ? 'jpg' : format}</span>
		</div>

		<div class="actions">
			<button class="cancel-btn" onclick={onclose}>Cancel</button>
			<button class="export-btn" onclick={handleExport}>Export</button>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.dialog {
		background: var(--bg-panel);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 24px;
		min-width: 340px;
		max-width: 420px;
	}

	h3 {
		margin-bottom: 16px;
		font-size: 16px;
	}

	.field {
		margin-bottom: 14px;
	}

	.field label {
		display: block;
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	.field-label {
		display: block;
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 4px;
	}

	select,
	input[type='number'] {
		width: 100%;
		padding: 6px 8px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: 13px;
	}

	.source-size {
		font-size: 12px;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.size-field .size-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.size-field .size-row input {
		flex: 1;
	}

	.multiply {
		color: var(--text-secondary);
	}

	.option-row label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-primary);
	}

	.option-row input[type='checkbox'] {
		width: auto;
	}

	.filename-preview {
		font-size: 12px;
		color: var(--accent);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 20px;
	}

	.cancel-btn {
		background: var(--bg-secondary);
	}

	.export-btn {
		background: var(--accent);
		color: #fff;
	}

	.export-btn:hover {
		background: var(--accent-hover);
	}
</style>
