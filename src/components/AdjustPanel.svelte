<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { defaultAdjustments, type AdjustmentParams } from '../lib/types';

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

	function updateParam(key: keyof AdjustmentParams, value: number) {
		imageState.adjustments = { ...imageState.adjustments, [key]: value };
	}

	function resetParam(key: keyof AdjustmentParams, defaultValue: number) {
		updateParam(key, defaultValue);
	}

	function resetAll() {
		imageState.adjustments = defaultAdjustments();
	}
</script>

<div class="adjust-panel">
	<div class="panel-header">
		<span>Adjustments</span>
		<button class="reset-btn" onclick={resetAll}>Reset All</button>
	</div>
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
		margin-bottom: 16px;
		font-weight: 600;
		font-size: 14px;
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
