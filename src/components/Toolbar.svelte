<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { decodeRawFile } from '../lib/raw-decoder/decoder';

	interface Props {
		onexport: () => void;
		oninfo: () => void;
	}

	let { onexport, oninfo }: Props = $props();

	let fileInput: HTMLInputElement;

	function openFile() {
		fileInput.click();
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		imageState.loading = true;
		imageState.filename = file.name;
		try {
			const buffer = await file.arrayBuffer();
			const result = await decodeRawFile(buffer);
			imageState.rawImage = result.image;
			imageState.metadata = result.metadata;
		} catch (err) {
			console.error('Failed to decode RAW file:', err);
			alert(`Failed to decode file: ${err instanceof Error ? err.message : err}`);
		} finally {
			imageState.loading = false;
			input.value = '';
		}
	}

	// Handle drag & drop
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.dataTransfer!.dropEffect = 'copy';
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files?.[0];
		if (!file) return;

		imageState.loading = true;
		imageState.filename = file.name;
		try {
			const buffer = await file.arrayBuffer();
			const result = await decodeRawFile(buffer);
			imageState.rawImage = result.image;
			imageState.metadata = result.metadata;
		} catch (err) {
			console.error('Failed to decode RAW file:', err);
			alert(`Failed to decode file: ${err instanceof Error ? err.message : err}`);
		} finally {
			imageState.loading = false;
		}
	}
</script>

<svelte:window ondragover={handleDragOver} ondrop={handleDrop} />

<header class="toolbar">
	<div class="toolbar-left">
		<button class="open-btn" onclick={openFile}>Open</button>
		<button onclick={onexport} disabled={!imageState.rawImage}>Export</button>
		<input
			bind:this={fileInput}
			type="file"
			accept=".cr2,.cr3,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.raw,.srw,.3fr,.kdc,.dcr,.mrw,.nrw,.srf"
			onchange={handleFileChange}
			hidden
		/>
	</div>
	<div class="toolbar-center">
		<span class="app-title">RAW Viewer</span>
		{#if imageState.filename}
			<span class="filename">{imageState.filename}</span>
		{/if}
	</div>
	<div class="toolbar-right">
		{#if imageState.loading}
			<span class="loading">Loading...</span>
		{/if}
		<button onclick={oninfo} disabled={!imageState.rawImage}>Info</button>
	</div>
</header>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		height: var(--toolbar-height);
		padding: 0 12px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border);
		gap: 8px;
	}

	.toolbar-left {
		display: flex;
		gap: 6px;
	}

	.toolbar-center {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	.app-title {
		font-weight: 600;
		font-size: 14px;
	}

	.filename {
		color: var(--text-secondary);
		font-size: 12px;
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.loading {
		color: var(--accent);
		font-size: 12px;
	}
</style>
