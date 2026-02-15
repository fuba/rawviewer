import type { RawImageData, ImageMetadata } from '../types';
import { parseDecodeEnvelope } from './backend-wire';

export interface DecodeResult {
	image: RawImageData;
	metadata: ImageMetadata;
}

export interface DecodeProgress {
	phase: 'upload' | 'processing' | 'download' | 'done';
	value: number;
	loaded?: number;
	total?: number;
}

export interface DecodeOptions {
	maxDimension?: number;
	timeoutMs?: number;
	signal?: AbortSignal;
	onProgress?: (progress: DecodeProgress) => void;
}

const UPLOAD_WEIGHT = 0.3;
const DOWNLOAD_WEIGHT = 0.65;
const DOWNLOAD_BASE = UPLOAD_WEIGHT;

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

function emitProgress(
	options: DecodeOptions,
	progress: DecodeProgress
): void {
	options.onProgress?.({
		...progress,
		value: clamp01(progress.value),
	});
}

function toErrorMessage(xhr: XMLHttpRequest): string {
	try {
		if (typeof xhr.responseText === 'string' && xhr.responseText.length > 0) {
			return xhr.responseText;
		}
	} catch {
		// responseText is unavailable for non-text responseType
	}
	if (xhr.response instanceof ArrayBuffer && xhr.response.byteLength > 0) {
		try {
			return new TextDecoder().decode(new Uint8Array(xhr.response));
		} catch {
			// ignore decode failure and fall through
		}
	}
	return '';
}

/**
 * Decode a RAW file buffer into RGB pixel data and metadata.
 * The payload is sent to the Go/libraw backend and returned as a binary envelope.
 */
export async function decodeRawFile(
	buffer: ArrayBuffer,
	filename?: string,
	options: DecodeOptions = {}
): Promise<DecodeResult> {
	const maxDimension = options.maxDimension ?? 0;
	const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
	emitProgress(options, { phase: 'upload', value: 0, loaded: 0, total: buffer.byteLength });

	return await new Promise<DecodeResult>((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		let settled = false;
		let sawDownloadProgress = false;
		let removeAbortListener = () => {};

		const timeoutId = setTimeout(() => {
			if (settled) return;
			xhr.abort();
			fail(new DOMException('Decode request timed out', 'TimeoutError'));
		}, timeoutMs);

		function cleanup(): void {
			removeAbortListener();
			clearTimeout(timeoutId);
		}

		function fail(error: Error): void {
			if (settled) return;
			settled = true;
			cleanup();
			reject(error);
		}

		function done(result: DecodeResult): void {
			if (settled) return;
			settled = true;
			cleanup();
			resolve(result);
		}

		if (options.signal) {
			const onAbort = () => {
				if (settled) return;
				xhr.abort();
				const reason = options.signal?.reason;
				const error = reason instanceof Error
					? reason
					: new DOMException('Decode request aborted', 'AbortError');
				fail(error);
			};
			if (options.signal.aborted) {
				onAbort();
				return;
			}
			options.signal.addEventListener('abort', onAbort, { once: true });
			removeAbortListener = () => options.signal?.removeEventListener('abort', onAbort);
		}

		xhr.open('POST', '/api/decode', true);
		xhr.responseType = 'arraybuffer';
		xhr.setRequestHeader('Content-Type', 'application/octet-stream');
		if (filename) {
			xhr.setRequestHeader('X-Filename', filename);
		}
		if (maxDimension > 0) {
			xhr.setRequestHeader('X-Max-Dimension', String(Math.round(maxDimension)));
		}

		xhr.upload.onprogress = (event) => {
			const total = event.lengthComputable ? event.total : buffer.byteLength;
			const loaded = event.loaded;
			const ratio = total > 0 ? loaded / total : 0;
			emitProgress(options, {
				phase: 'upload',
				value: ratio * UPLOAD_WEIGHT,
				loaded,
				total,
			});
		};

		xhr.upload.onloadend = () => {
			if (settled) return;
			emitProgress(options, { phase: 'processing', value: UPLOAD_WEIGHT });
		};

		xhr.onreadystatechange = () => {
			if (settled) return;
			if (xhr.readyState >= 2 && !sawDownloadProgress) {
				emitProgress(options, { phase: 'download', value: DOWNLOAD_BASE });
			}
		};

		xhr.onprogress = (event) => {
			if (settled) return;
			sawDownloadProgress = true;
			let ratio = 0;
			if (event.lengthComputable && event.total > 0) {
				ratio = event.loaded / event.total;
			} else if (event.loaded > 0) {
				// Best-effort estimate when content-length is unavailable.
				ratio = event.loaded / (event.loaded + 1024 * 1024);
			}
			emitProgress(options, {
				phase: 'download',
				value: DOWNLOAD_BASE + ratio * DOWNLOAD_WEIGHT,
				loaded: event.loaded,
				total: event.lengthComputable ? event.total : undefined,
			});
		};

		xhr.onerror = () => {
			fail(new Error('Decode API request failed'));
		};

		xhr.onload = () => {
			if (xhr.status < 200 || xhr.status >= 300) {
				const errText = toErrorMessage(xhr);
				fail(new Error(errText || `Decode API failed (${xhr.status})`));
				return;
			}
			if (!(xhr.response instanceof ArrayBuffer)) {
				fail(new Error('Decode API returned invalid payload'));
				return;
			}

			try {
				const envelope = parseDecodeEnvelope(xhr.response);
				emitProgress(options, { phase: 'done', value: 1 });
				done({
					image: envelope.image,
					metadata: envelope.metadata,
				});
			} catch (error) {
				fail(error instanceof Error ? error : new Error('Failed to parse decode payload'));
			}
		};

		xhr.send(buffer);
	});
}
