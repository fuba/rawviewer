<script lang="ts">
	import type { CropAspectPreset, CropRect } from '../lib/types';
	import { aspectPresetToRatio, clamp01, normalizeCropRect } from '../lib/transform/geometry';

	interface RectPx {
		x: number;
		y: number;
		width: number;
		height: number;
	}

	interface Props {
		imageRect: RectPx | null;
		cropRect: CropRect;
		aspectPreset: CropAspectPreset;
		onchange: (rect: CropRect) => void;
	}

	let { imageRect, cropRect, aspectPreset, onchange }: Props = $props();

	type DragMode = 'none' | 'move' | 'new' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se';

	let dragMode: DragMode = $state('none');
	let dragStartPoint: { x: number; y: number } = $state({ x: 0, y: 0 });
	let dragStartRect: CropRect = $state({ x: 0, y: 0, width: 1, height: 1 });
	let dragAnchor: { x: number; y: number } = $state({ x: 0, y: 0 });
	let dragHandleOffset: { x: number; y: number } = $state({ x: 0, y: 0 });
	let pointerId: number | null = $state(null);

	function pointInImage(clientX: number, clientY: number): boolean {
		if (!imageRect) return false;
		return clientX >= imageRect.x
			&& clientX <= imageRect.x + imageRect.width
			&& clientY >= imageRect.y
			&& clientY <= imageRect.y + imageRect.height;
	}

	function toNorm(clientX: number, clientY: number): { x: number; y: number } {
		if (!imageRect || imageRect.width <= 0 || imageRect.height <= 0) {
			return { x: 0, y: 0 };
		}
		return {
			x: (clientX - imageRect.x) / imageRect.width,
			y: (clientY - imageRect.y) / imageRect.height,
		};
	}

	function oppositeCorner(rect: CropRect, mode: DragMode): { x: number; y: number } {
		switch (mode) {
			case 'resize-nw':
				return { x: rect.x + rect.width, y: rect.y + rect.height };
			case 'resize-ne':
				return { x: rect.x, y: rect.y + rect.height };
			case 'resize-sw':
				return { x: rect.x + rect.width, y: rect.y };
			case 'resize-se':
				return { x: rect.x, y: rect.y };
			default:
				return { x: rect.x, y: rect.y };
		}
	}

	function handleCorner(rect: CropRect, mode: DragMode): { x: number; y: number } {
		switch (mode) {
			case 'resize-nw':
				return { x: rect.x, y: rect.y };
			case 'resize-ne':
				return { x: rect.x + rect.width, y: rect.y };
			case 'resize-sw':
				return { x: rect.x, y: rect.y + rect.height };
			case 'resize-se':
				return { x: rect.x + rect.width, y: rect.y + rect.height };
			default:
				return { x: rect.x, y: rect.y };
		}
	}

	function rectFromAnchor(
		anchor: { x: number; y: number },
		current: { x: number; y: number },
		ratio: number | null
	): CropRect {
		let dx = current.x - anchor.x;
		let dy = current.y - anchor.y;

		if (ratio && Math.abs(dx) > 0 && Math.abs(dy) > 0) {
			const signX = dx >= 0 ? 1 : -1;
			const signY = dy >= 0 ? 1 : -1;
			const absDx = Math.abs(dx);
			const absDy = Math.abs(dy);
			if (absDx / absDy > ratio) {
				dy = signY * (absDx / ratio);
			} else {
				dx = signX * (absDy * ratio);
			}
		}

		const x2 = anchor.x + dx;
		const y2 = anchor.y + dy;
		return normalizeCropRect({
			x: Math.min(anchor.x, x2),
			y: Math.min(anchor.y, y2),
			width: Math.abs(dx),
			height: Math.abs(dy),
		});
	}

	function onPointerDown(e: PointerEvent) {
		if (e.button !== 0 || !imageRect) return;
		const target = e.target as HTMLElement;
		const handle = target.dataset.handle;
		const isHandle = handle === 'nw' || handle === 'ne' || handle === 'sw' || handle === 'se';
		const inImage = pointInImage(e.clientX, e.clientY);
		const inCropBox = !!target.closest('.crop-box');
		if (!inImage && !isHandle && !inCropBox) return;

		const point = toNorm(e.clientX, e.clientY);

		if (isHandle) {
			dragMode = `resize-${handle}`;
			dragAnchor = oppositeCorner(cropRect, dragMode);
			dragStartRect = cropRect;
			const corner = handleCorner(cropRect, dragMode);
			dragHandleOffset = {
				x: point.x - corner.x,
				y: point.y - corner.y,
			};
		} else if (target.closest('.crop-box')) {
			dragMode = 'move';
			dragStartPoint = point;
			dragStartRect = cropRect;
			dragHandleOffset = { x: 0, y: 0 };
		} else {
			if (!inImage) return;
			dragMode = 'new';
			dragAnchor = point;
			dragHandleOffset = { x: 0, y: 0 };
		}

		pointerId = e.pointerId;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		e.preventDefault();
		e.stopPropagation();
	}

	function onPointerMove(e: PointerEvent) {
		if (dragMode === 'none' || pointerId !== e.pointerId) return;
		const ratio = aspectPresetToRatio(aspectPreset);
		const point = toNorm(e.clientX, e.clientY);

		if (dragMode === 'move') {
			const dx = point.x - dragStartPoint.x;
			const dy = point.y - dragStartPoint.y;
			const nextWidth = dragStartRect.width;
			const nextHeight = dragStartRect.height;
			const nextX = Math.max(0, Math.min(1 - nextWidth, dragStartRect.x + dx));
			const nextY = Math.max(0, Math.min(1 - nextHeight, dragStartRect.y + dy));
			onchange(normalizeCropRect({
				x: nextX,
				y: nextY,
				width: nextWidth,
				height: nextHeight,
			}));
			return;
		}

		if (dragMode === 'new') {
			onchange(rectFromAnchor(dragAnchor, point, ratio));
			return;
		}

		const corrected = {
			x: point.x - dragHandleOffset.x,
			y: point.y - dragHandleOffset.y,
		};
		onchange(rectFromAnchor(dragAnchor, corrected, ratio));
	}

	function endDrag(e: PointerEvent) {
		if (pointerId !== e.pointerId) return;
		pointerId = null;
		dragMode = 'none';
		dragHandleOffset = { x: 0, y: 0 };
	}
</script>

<div
	class="crop-overlay"
	role="presentation"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={endDrag}
	onpointercancel={endDrag}
	onwheel={(e: WheelEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}}
>
	{#if imageRect}
		<div
			class="image-frame"
			style={`left:${imageRect.x}px;top:${imageRect.y}px;width:${imageRect.width}px;height:${imageRect.height}px;`}
		>
			<div
				class="crop-box"
				style={`left:${cropRect.x * 100}%;top:${cropRect.y * 100}%;width:${cropRect.width * 100}%;height:${cropRect.height * 100}%;`}
			>
				<div class="grid"></div>
				<div class="handle nw" data-handle="nw"></div>
				<div class="handle ne" data-handle="ne"></div>
				<div class="handle sw" data-handle="sw"></div>
				<div class="handle se" data-handle="se"></div>
			</div>
		</div>
	{/if}
</div>

<style>
	.crop-overlay {
		position: absolute;
		inset: 0;
		z-index: 40;
		touch-action: none;
	}

	.image-frame {
		position: absolute;
		overflow: hidden;
	}

	.crop-box {
		position: absolute;
		border: 1px solid rgba(255, 255, 255, 0.95);
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
		cursor: move;
		min-width: 2px;
		min-height: 2px;
	}

	.grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(to right, transparent 33.333%, rgba(255, 255, 255, 0.35) 33.333%, rgba(255, 255, 255, 0.35) 34%, transparent 34%, transparent 66.666%, rgba(255, 255, 255, 0.35) 66.666%, rgba(255, 255, 255, 0.35) 67%, transparent 67%),
			linear-gradient(to bottom, transparent 33.333%, rgba(255, 255, 255, 0.35) 33.333%, rgba(255, 255, 255, 0.35) 34%, transparent 34%, transparent 66.666%, rgba(255, 255, 255, 0.35) 66.666%, rgba(255, 255, 255, 0.35) 67%, transparent 67%);
		pointer-events: none;
	}

	.handle {
		position: absolute;
		width: 16px;
		height: 16px;
		border: 1px solid rgba(255, 255, 255, 0.95);
		background: rgba(0, 0, 0, 0.4);
	}

	.handle.nw {
		left: -8px;
		top: -8px;
		cursor: nwse-resize;
	}

	.handle.ne {
		right: -8px;
		top: -8px;
		cursor: nesw-resize;
	}

	.handle.sw {
		left: -8px;
		bottom: -8px;
		cursor: nesw-resize;
	}

	.handle.se {
		right: -8px;
		bottom: -8px;
		cursor: nwse-resize;
	}
</style>
