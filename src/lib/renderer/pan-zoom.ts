import type { WebGLRenderer } from './webgl-renderer';

/**
 * Handles mouse/touch pan and zoom interactions on the canvas.
 */
export class PanZoomController {
	private renderer: WebGLRenderer;
	private canvas: HTMLCanvasElement;

	private isDragging = false;
	private lastX = 0;
	private lastY = 0;

	constructor(canvas: HTMLCanvasElement, renderer: WebGLRenderer) {
		this.canvas = canvas;
		this.renderer = renderer;

		this.canvas.addEventListener('mousedown', this.onMouseDown);
		this.canvas.addEventListener('mousemove', this.onMouseMove);
		this.canvas.addEventListener('mouseup', this.onMouseUp);
		this.canvas.addEventListener('mouseleave', this.onMouseUp);
		this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

		// Touch support
		this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
		this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
		this.canvas.addEventListener('touchend', this.onTouchEnd);
	}

	private onMouseDown = (e: MouseEvent) => {
		if (e.button !== 0) return; // left button only
		this.isDragging = true;
		this.lastX = e.clientX;
		this.lastY = e.clientY;
		this.canvas.style.cursor = 'grabbing';
	};

	private onMouseMove = (e: MouseEvent) => {
		if (!this.isDragging) return;

		const dx = e.clientX - this.lastX;
		const dy = e.clientY - this.lastY;
		this.lastX = e.clientX;
		this.lastY = e.clientY;

		// Convert pixel delta to NDC
		const rect = this.canvas.getBoundingClientRect();
		const ndcDx = (dx / rect.width) * 2;
		const ndcDy = -(dy / rect.height) * 2; // Y is flipped in NDC

		const pan = this.renderer.getPan();
		this.renderer.setPan(pan.x + ndcDx, pan.y + ndcDy);
		this.requestRender();
	};

	private onMouseUp = () => {
		this.isDragging = false;
		this.canvas.style.cursor = 'grab';
	};

	private onWheel = (e: WheelEvent) => {
		e.preventDefault();
		const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
		const currentZoom = this.renderer.getZoom();
		this.renderer.setZoom(currentZoom * zoomFactor);
		this.requestRender();
	};

	// Touch state
	private lastTouchDist = 0;
	private lastTouchCenter = { x: 0, y: 0 };

	private onTouchStart = (e: TouchEvent) => {
		e.preventDefault();
		if (e.touches.length === 1) {
			this.isDragging = true;
			this.lastX = e.touches[0].clientX;
			this.lastY = e.touches[0].clientY;
		} else if (e.touches.length === 2) {
			this.isDragging = false;
			this.lastTouchDist = this.getTouchDist(e);
			this.lastTouchCenter = this.getTouchCenter(e);
		}
	};

	private onTouchMove = (e: TouchEvent) => {
		e.preventDefault();
		if (e.touches.length === 1 && this.isDragging) {
			const dx = e.touches[0].clientX - this.lastX;
			const dy = e.touches[0].clientY - this.lastY;
			this.lastX = e.touches[0].clientX;
			this.lastY = e.touches[0].clientY;

			const rect = this.canvas.getBoundingClientRect();
			const ndcDx = (dx / rect.width) * 2;
			const ndcDy = -(dy / rect.height) * 2;

			const pan = this.renderer.getPan();
			this.renderer.setPan(pan.x + ndcDx, pan.y + ndcDy);
			this.requestRender();
		} else if (e.touches.length === 2) {
			// Pinch zoom
			const dist = this.getTouchDist(e);
			const scale = dist / this.lastTouchDist;
			this.lastTouchDist = dist;

			const currentZoom = this.renderer.getZoom();
			this.renderer.setZoom(currentZoom * scale);

			// Pan with pinch center
			const center = this.getTouchCenter(e);
			const dx = center.x - this.lastTouchCenter.x;
			const dy = center.y - this.lastTouchCenter.y;
			this.lastTouchCenter = center;

			const rect = this.canvas.getBoundingClientRect();
			const ndcDx = (dx / rect.width) * 2;
			const ndcDy = -(dy / rect.height) * 2;

			const pan = this.renderer.getPan();
			this.renderer.setPan(pan.x + ndcDx, pan.y + ndcDy);
			this.requestRender();
		}
	};

	private onTouchEnd = () => {
		this.isDragging = false;
	};

	private getTouchDist(e: TouchEvent): number {
		const dx = e.touches[0].clientX - e.touches[1].clientX;
		const dy = e.touches[0].clientY - e.touches[1].clientY;
		return Math.sqrt(dx * dx + dy * dy);
	}

	private getTouchCenter(e: TouchEvent): { x: number; y: number } {
		return {
			x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
			y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
		};
	}

	// Debounced render request
	private renderPending = false;
	private renderCallback: (() => void) | null = null;

	onRender(cb: () => void) {
		this.renderCallback = cb;
	}

	private requestRender() {
		if (this.renderPending) return;
		this.renderPending = true;
		requestAnimationFrame(() => {
			this.renderPending = false;
			this.renderCallback?.();
		});
	}

	/**
	 * Reset pan and zoom to default.
	 */
	resetView() {
		this.renderer.setPan(0, 0);
		this.renderer.setZoom(1);
		this.requestRender();
	}

	dispose() {
		this.canvas.removeEventListener('mousedown', this.onMouseDown);
		this.canvas.removeEventListener('mousemove', this.onMouseMove);
		this.canvas.removeEventListener('mouseup', this.onMouseUp);
		this.canvas.removeEventListener('mouseleave', this.onMouseUp);
		this.canvas.removeEventListener('wheel', this.onWheel);
		this.canvas.removeEventListener('touchstart', this.onTouchStart);
		this.canvas.removeEventListener('touchmove', this.onTouchMove);
		this.canvas.removeEventListener('touchend', this.onTouchEnd);
	}
}
