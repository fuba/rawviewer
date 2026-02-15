<script lang="ts">
	import { imageState } from '../lib/image-state.svelte';
	import type { CurvePoint, ToneCurve } from '../lib/types';

	type Channel = 'rgb' | 'red' | 'green' | 'blue';

	let activeChannel: Channel = $state('rgb');
	let svgEl: SVGSVGElement;
	let draggingIdx: number | null = $state(null);

	const svgSize = 200;
	const padding = 4;
	const innerSize = svgSize - padding * 2;

	const channelColors: Record<Channel, string> = {
		rgb: '#cccccc',
		red: '#ff6666',
		green: '#66ff66',
		blue: '#6666ff',
	};

	function getPoints(): CurvePoint[] {
		return imageState.toneCurve[activeChannel];
	}

	function setPoints(pts: CurvePoint[]) {
		imageState.toneCurve = { ...imageState.toneCurve, [activeChannel]: pts };
	}

	// Convert curve point (0-1) to SVG coordinates
	function toSvg(p: CurvePoint): { x: number; y: number } {
		return {
			x: padding + p.x * innerSize,
			y: padding + (1 - p.y) * innerSize,
		};
	}

	// Convert SVG coordinates to curve point (0-1)
	function fromSvg(svgX: number, svgY: number): CurvePoint {
		return {
			x: Math.max(0, Math.min(1, (svgX - padding) / innerSize)),
			y: Math.max(0, Math.min(1, 1 - (svgY - padding) / innerSize)),
		};
	}

	// Build SVG path string from curve points
	function buildPath(points: CurvePoint[]): string {
		if (points.length < 2) return '';
		const sorted = [...points].sort((a, b) => a.x - b.x);
		const svgPts = sorted.map(toSvg);
		return 'M ' + svgPts.map(p => `${p.x},${p.y}`).join(' L ');
	}

	function getSvgCoords(e: MouseEvent): { x: number; y: number } {
		const rect = svgEl.getBoundingClientRect();
		return {
			x: (e.clientX - rect.left) * (svgSize / rect.width),
			y: (e.clientY - rect.top) * (svgSize / rect.height),
		};
	}

	function handleMouseDown(e: MouseEvent, idx: number) {
		e.preventDefault();
		e.stopPropagation();
		draggingIdx = idx;
	}

	function handleMouseMove(e: MouseEvent) {
		if (draggingIdx === null) return;
		const { x, y } = getSvgCoords(e);
		const pt = fromSvg(x, y);
		const points = [...getPoints()];
		const isFirst = draggingIdx === 0;
		const isLast = draggingIdx === points.length - 1;

		if (isFirst || isLast) {
			// Keep endpoint x fixed, allow vertical movement.
			points[draggingIdx] = { x: points[draggingIdx].x, y: pt.y };
		} else {
			const minX = points[draggingIdx - 1].x + 0.001;
			const maxX = points[draggingIdx + 1].x - 0.001;
			points[draggingIdx] = {
				x: Math.max(minX, Math.min(maxX, pt.x)),
				y: pt.y,
			};
		}
		setPoints(points);
	}

	function handleMouseUp() {
		draggingIdx = null;
	}

	function handleDoubleClick(e: MouseEvent) {
		const { x, y } = getSvgCoords(e);
		const pt = fromSvg(x, y);
		const points = [...getPoints()];
		// Insert sorted by x
		let insertIdx = points.findIndex(p => p.x > pt.x);
		if (insertIdx === -1) insertIdx = points.length;
		points.splice(insertIdx, 0, pt);
		setPoints(points);
	}

	function handleSvgMouseDown(e: MouseEvent) {
		if (e.button !== 0) return;
		const target = e.target as Element;
		if (target instanceof SVGCircleElement) return;

		const { x, y } = getSvgCoords(e);
		const pt = fromSvg(x, y);
		const points = [...getPoints()];
		let insertIdx = points.findIndex(p => p.x > pt.x);
		if (insertIdx === -1) insertIdx = points.length;
		points.splice(insertIdx, 0, pt);
		setPoints(points);
		draggingIdx = insertIdx;
		e.preventDefault();
	}

	function handleRightClick(e: MouseEvent, idx: number) {
		e.preventDefault();
		// Don't delete endpoints
		if (idx === 0 || idx === getPoints().length - 1) return;
		const points = [...getPoints()];
		points.splice(idx, 1);
		setPoints(points);
	}

	function resetCurve() {
		setPoints([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
	}

	const channels: { key: Channel; label: string }[] = [
		{ key: 'rgb', label: 'RGB' },
		{ key: 'red', label: 'R' },
		{ key: 'green', label: 'G' },
		{ key: 'blue', label: 'B' },
	];
</script>

<svelte:window onmouseup={handleMouseUp} />

<div class="curve-editor">
	<div class="curve-header">
		<span>Tone Curve</span>
		<div class="channel-tabs">
			{#each channels as ch}
				<button
					class="channel-tab"
					class:active={activeChannel === ch.key}
					style:color={activeChannel === ch.key ? channelColors[ch.key] : ''}
					onclick={() => activeChannel = ch.key}
				>{ch.label}</button>
			{/each}
		</div>
		<button class="reset-btn" onclick={resetCurve}>Reset</button>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<svg
		bind:this={svgEl}
		viewBox="0 0 {svgSize} {svgSize}"
		class="curve-svg"
		onmousedown={handleSvgMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseUp}
		ondblclick={handleDoubleClick}
	>
		<!-- Background grid -->
		<rect x={padding} y={padding} width={innerSize} height={innerSize} fill="#1a1a1a" />
		{#each [0.25, 0.5, 0.75] as t}
			<line
				x1={padding + t * innerSize} y1={padding}
				x2={padding + t * innerSize} y2={padding + innerSize}
				stroke="#333" stroke-width="0.5"
			/>
			<line
				x1={padding} y1={padding + t * innerSize}
				x2={padding + innerSize} y2={padding + t * innerSize}
				stroke="#333" stroke-width="0.5"
			/>
		{/each}

		<!-- Diagonal reference line -->
		<line
			x1={padding} y1={padding + innerSize}
			x2={padding + innerSize} y2={padding}
			stroke="#444" stroke-width="0.5" stroke-dasharray="3,3"
		/>

		<!-- Curve path -->
		<path
			d={buildPath(getPoints())}
			fill="none"
			stroke={channelColors[activeChannel]}
			stroke-width="1.5"
		/>

		<!-- Control points -->
		{#each getPoints() as point, idx}
			{@const svgPt = toSvg(point)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle
				cx={svgPt.x}
				cy={svgPt.y}
				r="4"
				fill={channelColors[activeChannel]}
				stroke="#fff"
				stroke-width="1"
				class="control-point"
				class:endpoint={idx === 0 || idx === getPoints().length - 1}
				onmousedown={(e: MouseEvent) => handleMouseDown(e, idx)}
				oncontextmenu={(e: MouseEvent) => handleRightClick(e, idx)}
			/>
		{/each}
	</svg>
</div>

<style>
	.curve-editor {
		padding: 12px;
		border-top: 1px solid var(--border);
	}

	.curve-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
		font-weight: 600;
		font-size: 13px;
	}

	.channel-tabs {
		display: flex;
		gap: 2px;
		margin-left: auto;
	}

	.channel-tab {
		padding: 2px 6px;
		font-size: 11px;
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid transparent;
		border-radius: 3px;
	}

	.channel-tab.active {
		border-color: currentColor;
		background: rgba(255, 255, 255, 0.05);
	}

	.channel-tab:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.reset-btn {
		font-size: 11px;
		padding: 2px 6px;
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--border);
	}

	.curve-svg {
		width: 100%;
		aspect-ratio: 1;
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	.control-point {
		cursor: pointer;
	}

	.control-point.endpoint {
		cursor: default;
	}
</style>
