import { type AdjustmentParams, type ToneCurve, type RawImageData, type ImageMetadata, defaultAdjustments, defaultToneCurve } from './types';

// Reactive image state using Svelte 5 runes
// This module holds the central state shared across components.

let _rawImage: RawImageData | null = $state(null);
let _metadata: ImageMetadata | null = $state(null);
let _adjustments: AdjustmentParams = $state(defaultAdjustments());
let _toneCurve: ToneCurve = $state(defaultToneCurve());
let _loading: boolean = $state(false);
let _filename: string = $state('');

export const imageState = {
	get rawImage() { return _rawImage; },
	set rawImage(v: RawImageData | null) { _rawImage = v; },

	get metadata() { return _metadata; },
	set metadata(v: ImageMetadata | null) { _metadata = v; },

	get adjustments() { return _adjustments; },
	set adjustments(v: AdjustmentParams) { _adjustments = v; },

	get toneCurve() { return _toneCurve; },
	set toneCurve(v: ToneCurve) { _toneCurve = v; },

	get loading() { return _loading; },
	set loading(v: boolean) { _loading = v; },

	get filename() { return _filename; },
	set filename(v: string) { _filename = v; },

	reset() {
		_rawImage = null;
		_metadata = null;
		_adjustments = defaultAdjustments();
		_toneCurve = defaultToneCurve();
		_loading = false;
		_filename = '';
	},
};
