<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import { decodeRawFile, type DecodeProgress } from '../lib/raw-decoder/decoder';
	import { onDestroy } from 'svelte';
	const PREVIEW_MAX_DIMENSION = 1600;

	interface Props {
		onexport: () => void;
		oninfo: () => void;
	}

	let { onexport, oninfo }: Props = $props();

	let fileInput: HTMLInputElement;
	let decodeController: AbortController | null = null;
	let decodeSeq = 0;

	onDestroy(() => {
		decodeController?.abort();
	});

	function openFile() {
		fileInput.click();
	}

	function openProgressMessage(progress: DecodeProgress): string {
		switch (progress.phase) {
			case 'upload':
				return 'Uploading RAW...';
			case 'processing':
				return 'Decoding RAW...';
			case 'download':
				return 'Receiving pixels...';
			case 'done':
				return 'Open complete';
			default:
				return 'Opening RAW...';
		}
	}

	async function openRawFile(file: File) {
		decodeController?.abort();
		const controller = new AbortController();
		decodeController = controller;
		const seq = ++decodeSeq;

		imageState.beginTask('open', 'Reading file...');
		imageState.filename = file.name;
		try {
			const buffer = await file.arrayBuffer();
			imageState.sourceBuffer = buffer;
			imageState.updateTask(0.02, 'Uploading RAW...');
			const result = await decodeRawFile(buffer, file.name, {
				maxDimension: PREVIEW_MAX_DIMENSION,
				signal: controller.signal,
				onProgress: (progress) => {
					if (seq !== decodeSeq) return;
					imageState.updateTask(progress.value, openProgressMessage(progress));
				},
			});
			if (seq !== decodeSeq) return;
			imageState.rawImage = result.image;
			imageState.metadata = result.metadata;
		} catch (err) {
			if (controller.signal.aborted) {
				return;
			}
			console.error('Failed to decode RAW file:', err);
			alert(`Failed to decode file: ${err instanceof Error ? err.message : err}`);
		} finally {
			if (seq === decodeSeq) {
				imageState.finishTask();
			}
		}
	}

	async function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		await openRawFile(file);
		input.value = '';
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

		await openRawFile(file);
	}
</script>

<svelte:window ondragover={handleDragOver} ondrop={handleDrop} />

<header class="toolbar">
	<div class="toolbar-left">
		<button class="open-btn" onclick={openFile} disabled={imageState.loading}>Open</button>
		<button onclick={onexport} disabled={!imageState.rawImage || imageState.loading}>Export</button>
		<button
			onclick={() => imageState.beforeAfterEnabled = !imageState.beforeAfterEnabled}
			disabled={!imageState.rawImage || imageState.cropMode || imageState.loading}
		>
			{imageState.beforeAfterEnabled ? 'Hide Compare' : 'Before/After'}
		</button>
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
		{#if imageState.loading && imageState.taskKind}
			<div class="task-progress">
				<div class="task-header">
					<span class="loading">{imageState.taskKind === 'open' ? 'Opening' : 'Exporting'} {Math.round(imageState.taskProgress * 100)}%</span>
				</div>
				<div
					class="progress-track"
					role="progressbar"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow={Math.round(imageState.taskProgress * 100)}
					aria-label={imageState.taskKind === 'open' ? 'Open progress' : 'Export progress'}
				>
					<div class="progress-fill" style:width={`${Math.round(imageState.taskProgress * 100)}%`}></div>
				</div>
				{#if imageState.taskMessage}
					<span class="task-message">{imageState.taskMessage}</span>
				{/if}
			</div>
		{/if}
		{#if imageState.renderBackend === 'canvas2d'}
			<span class="fallback-warning">Canvas2D Fallback</span>
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
		font-weight: 600;
	}

	.task-progress {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 190px;
	}

	.task-header {
		display: flex;
		justify-content: space-between;
	}

	.progress-track {
		height: 6px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.18);
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--accent), var(--accent-hover));
		transition: width 0.16s ease-out;
	}

	.task-message {
		color: var(--text-secondary);
		font-size: 10px;
	}

	.fallback-warning {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 7px;
		border: 1px solid #ff8a8a;
		border-radius: 4px;
		background: rgba(255, 60, 60, 0.18);
		color: #ffd6d6;
		letter-spacing: 0.02em;
	}
</style>
