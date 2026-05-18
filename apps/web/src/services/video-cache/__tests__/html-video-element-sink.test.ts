import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import {
	clampFallbackFps,
	HTMLVideoElementSink,
	isWebCodecsAvailable,
	type VideoElementHandle,
} from "../html-video-element-sink";

type FakeCanvas = {
	width: number;
	height: number;
	getContext: (kind: string) => FakeCanvasContext | null;
};

type FakeCanvasContext = {
	drawImage: (...args: unknown[]) => void;
	drawnCount: number;
};

function installFakeDom(): {
	createdCanvases: FakeCanvas[];
	restore: () => void;
} {
	const createdCanvases: FakeCanvas[] = [];
	const originalDocument = (
		globalThis as { document?: unknown }
	).document;

	const fakeDocument = {
		createElement(tag: string) {
			if (tag !== "canvas") {
				throw new Error(`unexpected createElement(${tag}) in test`);
			}
			const ctx: FakeCanvasContext = {
				drawnCount: 0,
				drawImage() {
					ctx.drawnCount += 1;
				},
			};
			const canvas: FakeCanvas = {
				width: 0,
				height: 0,
				getContext(kind: string) {
					return kind === "2d" ? ctx : null;
				},
			};
			createdCanvases.push(canvas);
			return canvas;
		},
	};

	(globalThis as { document?: unknown }).document = fakeDocument;

	return {
		createdCanvases,
		restore() {
			(globalThis as { document?: unknown }).document = originalDocument;
		},
	};
}

function createFakeHandle({
	duration = 2,
	videoWidth = 640,
	videoHeight = 360,
}: {
	duration?: number;
	videoWidth?: number;
	videoHeight?: number;
} = {}): VideoElementHandle & {
	seekCalls: number[];
	drawCalls: number;
	disposed: boolean;
} {
	const handle = {
		seekCalls: [] as number[],
		drawCalls: 0,
		disposed: false,
		duration,
		videoWidth,
		videoHeight,
		async seek(time: number) {
			handle.seekCalls.push(time);
		},
		drawTo() {
			handle.drawCalls += 1;
		},
		dispose() {
			handle.disposed = true;
		},
	};
	return handle;
}

describe("clampFallbackFps", () => {
	test("returns default for undefined/NaN/zero/negative", () => {
		expect(clampFallbackFps(undefined)).toBe(30);
		expect(clampFallbackFps(Number.NaN)).toBe(30);
		expect(clampFallbackFps(0)).toBe(30);
		expect(clampFallbackFps(-5)).toBe(30);
	});

	test("rounds and clamps within [1, 60]", () => {
		expect(clampFallbackFps(24)).toBe(24);
		expect(clampFallbackFps(29.4)).toBe(29);
		expect(clampFallbackFps(120)).toBe(60);
		expect(clampFallbackFps(0.4)).toBe(1);
	});
});

describe("isWebCodecsAvailable", () => {
	const root = globalThis as { VideoDecoder?: unknown };
	let originalVideoDecoder: unknown;

	beforeEach(() => {
		originalVideoDecoder = root.VideoDecoder;
	});

	afterEach(() => {
		if (originalVideoDecoder === undefined) {
			delete root.VideoDecoder;
		} else {
			root.VideoDecoder = originalVideoDecoder;
		}
	});

	test("false when VideoDecoder is undefined", () => {
		delete root.VideoDecoder;
		expect(isWebCodecsAvailable()).toBe(false);
	});

	test("true when VideoDecoder is defined", () => {
		root.VideoDecoder = class {};
		expect(isWebCodecsAvailable()).toBe(true);
	});
});

describe("HTMLVideoElementSink.canvases", () => {
	let dom: ReturnType<typeof installFakeDom>;

	beforeEach(() => {
		dom = installFakeDom();
	});

	afterEach(() => {
		dom.restore();
	});

	test("yields frames stepping by 1/fps from startTimestamp", async () => {
		const handle = createFakeHandle({ duration: 0.25 });
		const sink = new HTMLVideoElementSink({ handle, fps: 10 }); // step = 0.1s

		const frames: Array<{ timestamp: number; duration: number }> = [];
		for await (const frame of sink.canvases(0)) {
			frames.push({
				timestamp: frame.timestamp,
				duration: frame.duration,
			});
		}

		expect(frames).toHaveLength(3);
		expect(frames[0].timestamp).toBeCloseTo(0, 5);
		expect(frames[1].timestamp).toBeCloseTo(0.1, 5);
		expect(frames[2].timestamp).toBeCloseTo(0.2, 5);
		expect(frames[0].duration).toBeCloseTo(0.1, 5);
		expect(handle.seekCalls).toEqual([0, 0.1, 0.2]);
		expect(handle.drawCalls).toBe(3);
	});

	test("respects endTimestamp", async () => {
		const handle = createFakeHandle({ duration: 5 });
		const sink = new HTMLVideoElementSink({ handle, fps: 10 });

		const frames: number[] = [];
		for await (const frame of sink.canvases(0, 0.2)) {
			frames.push(frame.timestamp);
		}

		expect(frames).toHaveLength(2);
		expect(frames[0]).toBeCloseTo(0, 5);
		expect(frames[1]).toBeCloseTo(0.1, 5);
	});

	test("dispose stops the iterator early", async () => {
		const handle = createFakeHandle({ duration: 10 });
		const sink = new HTMLVideoElementSink({ handle, fps: 10 });

		const collected: number[] = [];
		for await (const frame of sink.canvases(0)) {
			collected.push(frame.timestamp);
			if (collected.length === 2) sink.dispose();
		}

		expect(collected).toHaveLength(2);
		expect(handle.disposed).toBe(true);
	});

	test("returns no frames when start >= duration", async () => {
		const handle = createFakeHandle({ duration: 1 });
		const sink = new HTMLVideoElementSink({ handle, fps: 30 });

		const frames: number[] = [];
		for await (const frame of sink.canvases(2)) {
			frames.push(frame.timestamp);
		}
		expect(frames).toHaveLength(0);
		expect(handle.seekCalls).toHaveLength(0);
	});

	test("aborts cleanly when seek throws", async () => {
		const handle = createFakeHandle({ duration: 1 });
		handle.seek = async () => {
			throw new Error("boom");
		};
		const sink = new HTMLVideoElementSink({ handle, fps: 30 });

		const frames: number[] = [];
		for await (const frame of sink.canvases(0)) {
			frames.push(frame.timestamp);
		}
		expect(frames).toHaveLength(0);
	});

	test("clamps invalid fps passed to constructor to the default", async () => {
		const handle = createFakeHandle({ duration: 0.05 });
		// Passing 0 (negative, or NaN) used to leak through to 1/fps and produce
		// invalid frame stepping. The constructor must reject these and fall back
		// to the default FPS.
		const sink = new HTMLVideoElementSink({ handle, fps: 0 });
		const frames = [];
		for await (const frame of sink.canvases(0)) {
			frames.push(frame);
		}
		expect(frames).toHaveLength(2);
		expect(frames[0].duration).toBeCloseTo(1 / 30, 5);
	});

	test("frame canvas matches video dimensions", async () => {
		const handle = createFakeHandle({
			duration: 0.02,
			videoWidth: 1280,
			videoHeight: 720,
		});
		const sink = new HTMLVideoElementSink({ handle, fps: 30 });
		const frames = [];
		for await (const frame of sink.canvases(0)) {
			frames.push(frame);
		}
		expect(frames).toHaveLength(1);
		expect(frames[0].canvas.width).toBe(1280);
		expect(frames[0].canvas.height).toBe(720);
	});
});
