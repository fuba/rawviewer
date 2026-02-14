<script lang="ts">
	import Toolbar from './components/Toolbar.svelte';
	import Viewer from './components/Viewer.svelte';
	import AdjustPanel from './components/AdjustPanel.svelte';
	import CurveEditor from './components/CurveEditor.svelte';
	import Histogram from './components/Histogram.svelte';
	import ExportDialog from './components/ExportDialog.svelte';
	import MetadataPanel from './components/MetadataPanel.svelte';
	import { imageState } from './lib/image-state.svelte';
	import type { ExportOptions } from './lib/types';

	let showExportDialog = $state(false);
	let showMetadata = $state(false);
	let viewerComponent: ReturnType<typeof Viewer>;

	function handleExport(options: ExportOptions) {
		showExportDialog = false;
		// Export is handled by the Toolbar, which accesses the renderer
		const event = new CustomEvent('export-image', { detail: options });
		window.dispatchEvent(event);
	}

	function handleKeydown(e: KeyboardEvent) {
		// Global keyboard shortcuts
		if (e.ctrlKey || e.metaKey) {
			if (e.key === 'o') {
				e.preventDefault();
				document.querySelector<HTMLButtonElement>('.open-btn')?.click();
			}
			if (e.key === 'e' && imageState.rawImage) {
				e.preventDefault();
				showExportDialog = true;
			}
			if (e.key === 'i' && imageState.rawImage) {
				e.preventDefault();
				showMetadata = !showMetadata;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="app-layout">
	<Toolbar
		onexport={() => showExportDialog = true}
		oninfo={() => showMetadata = !showMetadata}
	/>
	<div class="main-area">
		<div class="viewer-area">
			<Viewer />
			{#if imageState.rawImage}
				<div class="histogram-bar">
					<Histogram />
				</div>
			{/if}
		</div>
		{#if imageState.rawImage}
			<aside class="side-panel">
				<AdjustPanel />
				<CurveEditor />
			</aside>
		{/if}
	</div>
</div>

{#if showExportDialog && imageState.rawImage}
	<ExportDialog
		filename={imageState.filename}
		onexport={handleExport}
		onclose={() => showExportDialog = false}
	/>
{/if}

{#if showMetadata}
	<MetadataPanel onclose={() => showMetadata = false} />
{/if}

<style>
	.app-layout {
		display: flex;
		flex-direction: column;
		width: 100%;
		height: 100%;
	}

	.main-area {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	.viewer-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		position: relative;
		overflow: hidden;
	}

	.histogram-bar {
		height: var(--histogram-height);
		background: var(--bg-secondary);
		border-top: 1px solid var(--border);
	}

	.side-panel {
		width: var(--panel-width);
		background: var(--bg-panel);
		border-left: 1px solid var(--border);
		overflow-y: auto;
	}
</style>
