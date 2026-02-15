<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { defaultAdjustments, type AdjustmentParams, type CropAspectPreset } from '../lib/types';
	import { computeAutoAdjustments } from '../lib/auto-adjust/auto-adjust';
	import { aspectPresetToRatio, normalizeCropRect } from '../lib/transform/geometry';

	interface SliderDef {
		key: keyof AdjustmentParams;
		label: string;
		min: number;
		max: number;
		step: number;
		default: number;
	}

	const sliders: SliderDef[] = [
		{ key: 'exposure', label: 'Exposure', min: -5, max: 5, step: 0.05, default: 0 },
		{ key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'tint', label: 'Tint', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'whites', label: 'Whites', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1, default: 0 },
		{ key: 'sharpness', label: 'Sharpness', min: 0, max: 100, step: 1, default: 0 },
	];

	const cropPresets: CropAspectPreset[] = ['free', '1:1', '4:3', '3:2', '16:9'];

	function updateParam(key: keyof AdjustmentParams, value: number) {
		imageState.adjustments = { ...imageState.adjustments, [key]: value };
	}

	function resetParam(key: keyof AdjustmentParams, defaultValue: number) {
		updateParam(key, defaultValue);
	}

	function resetAll() {
		imageState.adjustments = defaultAdjustments();
	}

	function normalizeRotation(rotationDeg: number): number {
		let v = ((rotationDeg % 360) + 360) % 360;
		if (v > 180) v -= 360;
		return v;
	}

	function setRotation(rotationDeg: number) {
		imageState.transform = {
			...imageState.transform,
			rotationDeg: normalizeRotation(rotationDeg),
		};
	}

	function rotateBy(deltaDeg: number) {
		setRotation(imageState.transform.rotationDeg + deltaDeg);
	}

	function resetTransform() {
		imageState.transform = {
			...imageState.transform,
			rotationDeg: 0,
			cropRect: null,
			cropApplied: false,
		};
		imageState.cropMode = false;
		imageState.draftCropRect = null;
	}

	function fitRectToAspectPreset(
		rect: { x: number; y: number; width: number; height: number },
		preset: CropAspectPreset
	) {
		const ratio = aspectPresetToRatio(preset);
		if (!ratio) return normalizeCropRect(rect);

		const cx = rect.x + rect.width / 2;
		const cy = rect.y + rect.height / 2;
		let width = rect.width;
		let height = rect.height;
		if (height <= 0 || width <= 0) {
			width = 1;
			height = 1 / ratio;
		} else if (width / height > ratio) {
			width = height * ratio;
		} else {
			height = width / ratio;
		}
		width = Math.min(width, 1);
		height = Math.min(height, 1);
		const x = Math.max(0, Math.min(1 - width, cx - width / 2));
		const y = Math.max(0, Math.min(1 - height, cy - height / 2));
		return normalizeCropRect({ x, y, width, height });
	}

	function enterCropMode() {
		imageState.cropMode = true;
		const base = imageState.transform.cropRect ?? { x: 0, y: 0, width: 1, height: 1 };
		imageState.draftCropRect = fitRectToAspectPreset(base, imageState.transform.cropAspectPreset);
	}

	function cancelCropMode() {
		imageState.cropMode = false;
		imageState.draftCropRect = null;
	}

	function applyCrop() {
		const rect = imageState.draftCropRect ?? { x: 0, y: 0, width: 1, height: 1 };
		const fitted = fitRectToAspectPreset(rect, imageState.transform.cropAspectPreset);
		imageState.transform = {
			...imageState.transform,
			cropRect: fitted,
			cropApplied: true,
		};
		imageState.cropMode = false;
		imageState.draftCropRect = null;
	}

	function clearCrop() {
		imageState.transform = {
			...imageState.transform,
			cropRect: null,
			cropApplied: false,
		};
		imageState.cropMode = false;
		imageState.draftCropRect = null;
	}

	function setCropAspectPreset(preset: CropAspectPreset) {
		imageState.transform = {
			...imageState.transform,
			cropAspectPreset: preset,
		};
		if (imageState.cropMode && imageState.draftCropRect) {
			imageState.draftCropRect = fitRectToAspectPreset(imageState.draftCropRect, preset);
		}
	}

	function applyAutoCorrection() {
		if (!imageState.rawImage) return;
		const transform = imageState.cropMode && imageState.draftCropRect
			? {
				...imageState.transform,
				cropApplied: true,
				cropRect: imageState.draftCropRect,
			}
			: imageState.transform;
		imageState.adjustments = computeAutoAdjustments(
			imageState.rawImage,
			imageState.adjustments,
			transform
		);
	}
</script>

<div class="adjust-panel">
	<div class="panel-header">
		<span>Adjustments</span>
		<button class="reset-btn" onclick={resetAll}>Reset All</button>
	</div>

	<div class="action-row">
		<button class="auto-btn" onclick={applyAutoCorrection}>Auto Correction</button>
	</div>

	<section class="section">
		<div class="section-header">
			<span>Transform</span>
			<button class="mini-btn" onclick={resetTransform}>Reset</button>
		</div>
		<div class="button-row">
			<button onclick={() => rotateBy(-90)}>-90°</button>
			<button onclick={() => rotateBy(90)}>+90°</button>
		</div>
		<div class="slider-group">
			<div class="slider-header">
				<label for="rotation">Rotation</label>
				<span class="slider-value">{imageState.transform.rotationDeg.toFixed(0)}°</span>
			</div>
			<input
				type="range"
				id="rotation"
				min="-180"
				max="180"
				step="1"
				value={imageState.transform.rotationDeg}
				oninput={(e: Event) => {
					const val = parseFloat((e.target as HTMLInputElement).value);
					setRotation(val);
				}}
				ondblclick={() => setRotation(0)}
			/>
		</div>
	</section>

	<section class="section">
		<div class="section-header">
			<span>Crop</span>
			{#if imageState.transform.cropApplied}
				<span class="status-tag">Applied</span>
			{/if}
		</div>
		<div class="field-row">
			<label for="crop-aspect">Aspect</label>
			<select
				id="crop-aspect"
				value={imageState.transform.cropAspectPreset}
				onchange={(e: Event) => {
					setCropAspectPreset((e.target as HTMLSelectElement).value as CropAspectPreset);
				}}
			>
				{#each cropPresets as preset}
					<option value={preset}>{preset}</option>
				{/each}
			</select>
		</div>
		<div class="button-row">
			{#if !imageState.cropMode}
				<button onclick={enterCropMode}>Edit Crop</button>
			{:else}
				<button class="primary" onclick={applyCrop}>Apply</button>
				<button onclick={cancelCropMode}>Cancel</button>
			{/if}
			<button onclick={clearCrop} disabled={!imageState.transform.cropApplied && !imageState.cropMode}>Clear</button>
		</div>
	</section>

	{#each sliders as slider}
		<div class="slider-group">
			<div class="slider-header">
				<label for={slider.key}>{slider.label}</label>
				<span class="slider-value">{imageState.adjustments[slider.key].toFixed(slider.step < 1 ? 2 : 0)}</span>
			</div>
			<input
				type="range"
				id={slider.key}
				min={slider.min}
				max={slider.max}
				step={slider.step}
				value={imageState.adjustments[slider.key]}
				oninput={(e: Event) => {
					const val = parseFloat((e.target as HTMLInputElement).value);
					updateParam(slider.key, val);
				}}
				ondblclick={() => resetParam(slider.key, slider.default)}
			/>
		</div>
	{/each}
</div>

<style>
	.adjust-panel {
		padding: 12px;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		font-weight: 600;
		font-size: 14px;
	}

	.action-row {
		margin-bottom: 14px;
	}

	.auto-btn {
		width: 100%;
		background: var(--accent);
		color: #fff;
	}

	.reset-btn {
		font-size: 11px;
		padding: 3px 8px;
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border);
	}

	.reset-btn:hover {
		color: var(--text-primary);
		border-color: var(--text-secondary);
		background: transparent;
	}

	.section {
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 10px;
		margin-bottom: 12px;
		background: rgba(0, 0, 0, 0.12);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--text-secondary);
	}

	.mini-btn {
		padding: 2px 8px;
		font-size: 11px;
	}

	.status-tag {
		font-size: 11px;
		color: var(--accent);
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}

	.field-row label {
		font-size: 12px;
		color: var(--text-secondary);
		min-width: 44px;
	}

	.field-row select {
		flex: 1;
		padding: 5px 7px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: 12px;
	}

	.button-row {
		display: flex;
		gap: 6px;
	}

	.button-row button {
		flex: 1;
		padding: 5px 8px;
		font-size: 12px;
	}

	.button-row .primary {
		background: var(--accent);
		color: #fff;
	}

	.slider-group {
		margin-bottom: 12px;
	}

	.slider-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 4px;
	}

	.slider-header label {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.slider-value {
		font-size: 11px;
		color: var(--text-secondary);
		min-width: 40px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
