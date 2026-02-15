const MIN_SPLIT = 0.02;
const MAX_SPLIT = 0.98;
const DEFAULT_SPLIT = 0.5;

export function clampBeforeAfterSplit(value: number): number {
	if (!Number.isFinite(value)) return DEFAULT_SPLIT;
	return Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, value));
}

export function resolveBeforeAfterSplitFromPointer(
	clientX: number,
	containerLeft: number,
	containerWidth: number
): number {
	if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
		return DEFAULT_SPLIT;
	}
	return clampBeforeAfterSplit((clientX - containerLeft) / containerWidth);
}
