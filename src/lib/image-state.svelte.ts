import {
	type AdjustmentParams,
	type ToneCurve,
	type RawImageData,
	type ImageMetadata,
	type TransformParams,
	type CropRect,
	type RenderBackend,
	type TaskKind,
	defaultAdjustments,
	defaultToneCurve,
	defaultTransform,
} from './types';

// Reactive image state using Svelte 5 runes
// This module holds the central state shared across components.

let _rawImage: RawImageData | null = $state(null);
let _metadata: ImageMetadata | null = $state(null);
let _adjustments: AdjustmentParams = $state(defaultAdjustments());
let _toneCurve: ToneCurve = $state(defaultToneCurve());
let _transform: TransformParams = $state(defaultTransform());
let _cropMode: boolean = $state(false);
let _draftCropRect: CropRect | null = $state(null);
let _sourceBuffer: ArrayBuffer | null = $state(null);
let _renderBackend: RenderBackend = $state(null);
let _loading: boolean = $state(false);
let _filename: string = $state('');
let _taskKind: TaskKind = $state(null);
let _taskProgress: number = $state(0);
let _taskMessage: string = $state('');

function clampProgress(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

export const imageState = {
	get rawImage() { return _rawImage; },
	set rawImage(v: RawImageData | null) { _rawImage = v; },

	get metadata() { return _metadata; },
	set metadata(v: ImageMetadata | null) { _metadata = v; },

	get adjustments() { return _adjustments; },
	set adjustments(v: AdjustmentParams) { _adjustments = v; },

	get toneCurve() { return _toneCurve; },
	set toneCurve(v: ToneCurve) { _toneCurve = v; },

	get transform() { return _transform; },
	set transform(v: TransformParams) { _transform = v; },

	get cropMode() { return _cropMode; },
	set cropMode(v: boolean) { _cropMode = v; },

	get draftCropRect() { return _draftCropRect; },
	set draftCropRect(v: CropRect | null) { _draftCropRect = v; },

	get sourceBuffer() { return _sourceBuffer; },
	set sourceBuffer(v: ArrayBuffer | null) { _sourceBuffer = v; },

	get renderBackend() { return _renderBackend; },
	set renderBackend(v: RenderBackend) { _renderBackend = v; },

	get loading() { return _loading; },
	set loading(v: boolean) { _loading = v; },

	get filename() { return _filename; },
	set filename(v: string) { _filename = v; },

	get taskKind() { return _taskKind; },
	set taskKind(v: TaskKind) { _taskKind = v; },

	get taskProgress() { return _taskProgress; },
	set taskProgress(v: number) { _taskProgress = clampProgress(v); },

	get taskMessage() { return _taskMessage; },
	set taskMessage(v: string) { _taskMessage = v; },

	beginTask(kind: Exclude<TaskKind, null>, message = '') {
		_taskKind = kind;
		_taskProgress = 0;
		_taskMessage = message;
		_loading = true;
	},

	updateTask(progress: number, message?: string) {
		_taskProgress = clampProgress(progress);
		if (typeof message === 'string') {
			_taskMessage = message;
		}
		_loading = _taskKind !== null;
	},

	finishTask() {
		_loading = false;
		_taskKind = null;
		_taskProgress = 0;
		_taskMessage = '';
	},

	reset() {
		_rawImage = null;
		_metadata = null;
		_adjustments = defaultAdjustments();
		_toneCurve = defaultToneCurve();
		_transform = defaultTransform();
		_cropMode = false;
		_draftCropRect = null;
		_sourceBuffer = null;
		_renderBackend = null;
		_loading = false;
		_filename = '';
		_taskKind = null;
		_taskProgress = 0;
		_taskMessage = '';
	},
};
