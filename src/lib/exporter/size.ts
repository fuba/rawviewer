export function resolveExportSize(
	sourceWidth: number,
	sourceHeight: number,
	targetWidth: number,
	targetHeight: number,
	upscale: boolean
): { width: number; height: number } {
	const sw = Math.max(1, Math.round(sourceWidth));
	const sh = Math.max(1, Math.round(sourceHeight));
	const aspect = sw / sh;

	let tw = Math.max(1, Math.round(targetWidth));
	let th = Math.max(1, Math.round(targetHeight));

	// Keep aspect ratio: width drives height.
	th = Math.max(1, Math.round(tw / aspect));

	if (!upscale) {
		if (tw > sw) {
			tw = sw;
			th = sh;
		}
		if (th > sh) {
			th = sh;
			tw = sw;
		}
	}

	return { width: tw, height: th };
}
