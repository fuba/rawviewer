<script lang="ts">
	import type { ExportFormat, ExportOptions } from '../lib/types';

	interface Props {
		filename: string;
		onexport: (options: ExportOptions) => void;
		onclose: () => void;
	}

	let { filename, onexport, onclose }: Props = $props();

	let format: ExportFormat = $state('jpeg');
	let quality: number = $state(92);

	function baseName(name: string): string {
		const dot = name.lastIndexOf('.');
		return dot > 0 ? name.substring(0, dot) : name;
	}

	function handleExport() {
		onexport({
			format,
			quality,
			filename: baseName(filename),
		});
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		if (e.key === 'Enter') handleExport();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onkeydown={handleKeydown} onclick={onclose}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
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
		min-width: 320px;
		max-width: 400px;
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

	select {
		width: 100%;
		padding: 6px 8px;
		background: var(--bg-secondary);
		color: var(--text-primary);
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: 13px;
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
