import {
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import {
	FallbackAudioBufferSink,
	isWebAudioDecoderAvailable,
	sliceAudioBuffer,
} from "../fallback-audio-buffer-sink";

type AudioBufferLike = {
	length: number;
	sampleRate: number;
	numberOfChannels: number;
	duration: number;
	getChannelData: (channel: number) => Float32Array;
	copyToChannel: (
		source: Float32Array,
		channel: number,
		startInChannel?: number,
	) => void;
};

function createTestAudioBuffer({
	durationSeconds = 1,
	sampleRate = 8,
	channelCount = 2,
}: {
	durationSeconds?: number;
	sampleRate?: number;
	channelCount?: number;
} = {}): AudioBufferLike {
	const length = Math.round(durationSeconds * sampleRate);
	const channels = Array.from(
		{ length: channelCount },
		(_, channelIndex) =>
			new Float32Array(
				Array.from({ length }, (_, i) => channelIndex + 1 + i * 0.01),
			),
	);
	return {
		length,
		sampleRate,
		numberOfChannels: channelCount,
		duration: durationSeconds,
		getChannelData(channel: number) {
			return channels[channel];
		},
		// eslint-disable-next-line opencut/prefer-object-params -- mirrors the AudioBuffer.copyToChannel Web API signature so this fake behaves like the real one
		copyToChannel(
			source: Float32Array,
			channel: number,
			startInChannel = 0,
		) {
			channels[channel].set(source, startInChannel);
		},
	};
}

function installFakeAudioBuffer(): { restore: () => void } {
	const root = globalThis as { AudioBuffer?: unknown };
	const original = root.AudioBuffer;
	class FakeAudioBuffer implements AudioBufferLike {
		length: number;
		sampleRate: number;
		numberOfChannels: number;
		duration: number;
		private channels: Float32Array[];

		constructor(opts: {
			length: number;
			numberOfChannels: number;
			sampleRate: number;
		}) {
			this.length = opts.length;
			this.sampleRate = opts.sampleRate;
			this.numberOfChannels = opts.numberOfChannels;
			this.duration = opts.length / opts.sampleRate;
			this.channels = Array.from(
				{ length: opts.numberOfChannels },
				() => new Float32Array(opts.length),
			);
		}

		getChannelData(channel: number): Float32Array {
			return this.channels[channel];
		}

		// eslint-disable-next-line opencut/prefer-object-params -- mirrors AudioBuffer.copyToChannel Web API signature
		copyToChannel(
			source: Float32Array,
			channel: number,
			startInChannel = 0,
		): void {
			this.channels[channel].set(source, startInChannel);
		}
	}
	root.AudioBuffer = FakeAudioBuffer;
	return {
		restore() {
			if (original === undefined) {
				delete root.AudioBuffer;
			} else {
				root.AudioBuffer = original;
			}
		},
	};
}

describe("isWebAudioDecoderAvailable", () => {
	const root = globalThis as { AudioDecoder?: unknown };
	let original: unknown;

	beforeEach(() => {
		original = root.AudioDecoder;
	});

	afterEach(() => {
		if (original === undefined) {
			delete root.AudioDecoder;
		} else {
			root.AudioDecoder = original;
		}
	});

	test("returns false when AudioDecoder undefined", () => {
		delete root.AudioDecoder;
		expect(isWebAudioDecoderAvailable()).toBe(false);
	});

	test("returns true when AudioDecoder defined", () => {
		root.AudioDecoder = class {};
		expect(isWebAudioDecoderAvailable()).toBe(true);
	});
});

describe("sliceAudioBuffer", () => {
	let fakeAudioBuffer: ReturnType<typeof installFakeAudioBuffer>;

	beforeEach(() => {
		fakeAudioBuffer = installFakeAudioBuffer();
	});

	afterEach(() => {
		fakeAudioBuffer.restore();
	});

	test("slices to the requested range", () => {
		const buffer = createTestAudioBuffer({
			durationSeconds: 1,
			sampleRate: 8,
			channelCount: 1,
		});
		const sliced = sliceAudioBuffer({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			buffer: buffer as unknown as AudioBuffer,
			start: 0.25,
			end: 0.75,
		});
		expect(sliced.length).toBe(4);
		expect(sliced.numberOfChannels).toBe(1);
		expect(sliced.sampleRate).toBe(8);
		const channel = sliced.getChannelData(0);
		expect(channel[0]).toBeCloseTo(1 + 0.02, 5);
		expect(channel[3]).toBeCloseTo(1 + 0.05, 5);
	});

	test("clamps out-of-range start/end", () => {
		const buffer = createTestAudioBuffer({
			durationSeconds: 0.5,
			sampleRate: 8,
			channelCount: 1,
		});
		const sliced = sliceAudioBuffer({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			buffer: buffer as unknown as AudioBuffer,
			start: -1,
			end: 5,
		});
		expect(sliced.length).toBe(buffer.length);
	});

	test("preserves channel count", () => {
		const buffer = createTestAudioBuffer({
			durationSeconds: 1,
			sampleRate: 8,
			channelCount: 2,
		});
		const sliced = sliceAudioBuffer({
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			buffer: buffer as unknown as AudioBuffer,
			start: 0,
			end: 0.5,
		});
		expect(sliced.numberOfChannels).toBe(2);
	});
});

describe("FallbackAudioBufferSink.buffers", () => {
	let fakeAudioBuffer: ReturnType<typeof installFakeAudioBuffer>;

	beforeEach(() => {
		fakeAudioBuffer = installFakeAudioBuffer();
	});

	afterEach(() => {
		fakeAudioBuffer.restore();
	});

	test("yields a single buffer covering the full range by default", async () => {
		const decoded = createTestAudioBuffer({
			durationSeconds: 1,
			sampleRate: 8,
			channelCount: 1,
		});
		const sink = new FallbackAudioBufferSink(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			decoded as unknown as AudioBuffer,
		);
		const yielded = [];
		for await (const wrapped of sink.buffers()) {
			yielded.push(wrapped);
		}
		expect(yielded).toHaveLength(1);
		expect(yielded[0].timestamp).toBe(0);
		expect(yielded[0].duration).toBeCloseTo(1, 5);
	});

	test("yields a slice when startTimestamp/endTimestamp provided", async () => {
		const decoded = createTestAudioBuffer({
			durationSeconds: 2,
			sampleRate: 8,
			channelCount: 1,
		});
		const sink = new FallbackAudioBufferSink(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			decoded as unknown as AudioBuffer,
		);
		const yielded = [];
		for await (const wrapped of sink.buffers(0.5, 1.5)) {
			yielded.push(wrapped);
		}
		expect(yielded).toHaveLength(1);
		expect(yielded[0].timestamp).toBe(0.5);
		expect(yielded[0].duration).toBeCloseTo(1, 5);
	});

	test("treats NaN/Infinity startTimestamp as 0", async () => {
		const decoded = createTestAudioBuffer({
			durationSeconds: 1,
			sampleRate: 8,
			channelCount: 1,
		});
		const sink = new FallbackAudioBufferSink(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			decoded as unknown as AudioBuffer,
		);
		const yielded = [];
		for await (const wrapped of sink.buffers(Number.NaN)) {
			yielded.push(wrapped);
		}
		expect(yielded).toHaveLength(1);
		expect(yielded[0].timestamp).toBe(0);
		expect(yielded[0].duration).toBeCloseTo(1, 5);
	});

	test("yields nothing when start >= end (or beyond duration)", async () => {
		const decoded = createTestAudioBuffer({
			durationSeconds: 1,
			sampleRate: 8,
			channelCount: 1,
		});
		const sink = new FallbackAudioBufferSink(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			decoded as unknown as AudioBuffer,
		);

		const yielded = [];
		for await (const wrapped of sink.buffers(2)) {
			yielded.push(wrapped);
		}
		expect(yielded).toHaveLength(0);

		const yielded2 = [];
		for await (const wrapped of sink.buffers(0.4, 0.4)) {
			yielded2.push(wrapped);
		}
		expect(yielded2).toHaveLength(0);
	});

	test("exposes sampleRate/numberOfChannels/duration getters", () => {
		const decoded = createTestAudioBuffer({
			durationSeconds: 3,
			sampleRate: 16,
			channelCount: 2,
		});
		const sink = new FallbackAudioBufferSink(
			// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the fake duck-typed AudioBuffer is sufficient for this unit test
			decoded as unknown as AudioBuffer,
		);
		expect(sink.sampleRate).toBe(16);
		expect(sink.numberOfChannels).toBe(2);
		expect(sink.duration).toBe(3);
	});
});
