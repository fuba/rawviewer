import { afterEach, describe, expect, it } from 'vitest';
import { decodeRawFile, type DecodeProgress } from '../src/lib/raw-decoder/decoder';

function buildEnvelope(opts: {
	width: number;
	height: number;
	channels: number;
	bitsPerSample: 8 | 16;
	metadata: object;
	pixelBytes: Uint8Array;
}): ArrayBuffer {
	const metadataBytes = new TextEncoder().encode(JSON.stringify(opts.metadata));
	const headerSize = 4 + 4 * 6;
	const totalSize = headerSize + metadataBytes.length + opts.pixelBytes.length;
	const out = new Uint8Array(totalSize);
	const view = new DataView(out.buffer);

	out[0] = 0x52; // R
	out[1] = 0x56; // V
	out[2] = 0x44; // D
	out[3] = 0x31; // 1

	view.setUint32(4, opts.width, true);
	view.setUint32(8, opts.height, true);
	view.setUint32(12, opts.channels, true);
	view.setUint32(16, opts.bitsPerSample, true);
	view.setUint32(20, opts.pixelBytes.length, true);
	view.setUint32(24, metadataBytes.length, true);
	out.set(metadataBytes, headerSize);
	out.set(opts.pixelBytes, headerSize + metadataBytes.length);
	return out.buffer;
}

type UploadHandlers = {
	onprogress: ((event: ProgressEvent<EventTarget>) => void) | null;
	onloadend: ((event: ProgressEvent<EventTarget>) => void) | null;
};

class MockXMLHttpRequest {
	static responseBuffer: ArrayBuffer = new ArrayBuffer(0);
	static responseStatus = 200;

	upload: UploadHandlers = {
		onprogress: null,
		onloadend: null,
	};

	responseType: XMLHttpRequestResponseType = '';
	response: ArrayBuffer | null = null;
	status = 0;
	onprogress: ((event: ProgressEvent<EventTarget>) => void) | null = null;
	onload: ((event: ProgressEvent<EventTarget>) => void) | null = null;
	onerror: ((event: ProgressEvent<EventTarget>) => void) | null = null;
	onabort: ((event: ProgressEvent<EventTarget>) => void) | null = null;
	onreadystatechange: ((event: Event) => void) | null = null;
	readyState = 0;

	open(_method: string, _url: string): void {}
	setRequestHeader(_name: string, _value: string): void {}

	send(body: Document | XMLHttpRequestBodyInit | null): void {
		const bytes = body instanceof ArrayBuffer ? body.byteLength : 0;
		this.upload.onprogress?.(new ProgressEvent('progress', { lengthComputable: true, loaded: Math.round(bytes / 2), total: bytes }));
		this.upload.onprogress?.(new ProgressEvent('progress', { lengthComputable: true, loaded: bytes, total: bytes }));
		this.upload.onloadend?.(new ProgressEvent('loadend'));

		this.readyState = 2;
		this.onreadystatechange?.(new Event('readystatechange'));

		this.status = MockXMLHttpRequest.responseStatus;
		this.response = MockXMLHttpRequest.responseBuffer;
		this.onprogress?.(new ProgressEvent('progress', {
			lengthComputable: true,
			loaded: MockXMLHttpRequest.responseBuffer.byteLength,
			total: MockXMLHttpRequest.responseBuffer.byteLength,
		}));
		this.onload?.(new ProgressEvent('load'));
	}

	abort(): void {
		this.onabort?.(new ProgressEvent('abort'));
	}
}

const OriginalXHR = globalThis.XMLHttpRequest;

afterEach(() => {
	globalThis.XMLHttpRequest = OriginalXHR;
});

describe('decodeRawFile progress', () => {
	it('reports progress phases and decodes envelope', async () => {
		MockXMLHttpRequest.responseStatus = 200;
		MockXMLHttpRequest.responseBuffer = buildEnvelope({
			width: 2,
			height: 1,
			channels: 3,
			bitsPerSample: 16,
			metadata: {
				make: 'SIGMA',
				model: 'fp',
				iso: 100,
				shutter: 0.01,
				aperture: 4,
				focalLength: 20,
				width: 2,
				height: 1,
				description: '',
				artist: '',
			},
			pixelBytes: new Uint8Array([1, 0, 2, 0, 3, 0]),
		});
		globalThis.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest;

		const events: DecodeProgress[] = [];
		const result = await decodeRawFile(new Uint8Array(64).buffer, 'sample.dng', {
			onProgress: (progress) => events.push(progress),
		});

		expect(result.image.width).toBe(2);
		expect(result.image.height).toBe(1);
		expect(result.metadata.model).toBe('fp');
		expect(events.length).toBeGreaterThan(0);
		expect(events[0].phase).toBe('upload');
		expect(events.some((v) => v.phase === 'processing')).toBe(true);
		expect(events.some((v) => v.phase === 'download')).toBe(true);
		expect(events[events.length - 1].phase).toBe('done');
		expect(events[events.length - 1].value).toBe(1);
	});
});
