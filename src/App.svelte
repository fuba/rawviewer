<script lang="ts">
	import Toolbar from './components/Toolbar.svelte';
	import Viewer from './components/Viewer.svelte';
	import AdjustPanel from './components/AdjustPanel.svelte';
	import Histogram from './components/Histogram.svelte';
	import { imageState } from './lib/image-state.svelte';
</script>

<div class="app-layout">
	<Toolbar />
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
			</aside>
		{/if}
	</div>
</div>

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
