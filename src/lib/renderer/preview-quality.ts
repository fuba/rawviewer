const INTERACTIVE_DPR_CAP = 1.0;
const IDLE_DPR_CAP = 1.5;
const MIN_DPR = 0.75;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function resolvePreviewPixelRatio(devicePixelRatio: number, interactive: boolean): number {
	const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
	const cap = interactive ? INTERACTIVE_DPR_CAP : IDLE_DPR_CAP;
	return clamp(Math.min(dpr, cap), MIN_DPR, cap);
}
