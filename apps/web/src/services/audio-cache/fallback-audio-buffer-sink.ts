import type { WrappedAudioBuffer } from "mediabunny";

export interface AudioBufferSinkLike {
	buffers(
		startTimestamp?: number,
		endTimestamp?: number,
	): AsyncGenerator<WrappedAudioBuffer, void, unknown>;
}

export function isWebAudioDecoderAvailable(): boolean {
	return (
		typeof (globalThis as { AudioDecoder?: unknown }).AudioDecoder !==
		"undefined"
	);
}

/**
 * AudioBufferSink implementation backed by AudioContext.decodeAudioData.
 *
 * Used when mediabunny's AudioSampleSink cannot decode the track because the
 * environment lacks the WebCodecs AudioDecoder API. AudioContext.decodeAudioData
 * uses the system's native audio decoders, mirroring the strategy used by
 * HTMLVideoElementSink for video. The entire compressed audio is decoded
 * upfront and exposed through a buffers() iterator that yields a single
 * AudioBuffer slice covering the requested range.
 */
export class FallbackAudioBufferSink implements AudioBufferSinkLike {
	constructor(private readonly decoded: AudioBuffer) {}

	static async create({
		file,
		audioContext,
	}: {
		file: File;
		audioContext: BaseAudioContext;
	}): Promise<FallbackAudioBufferSink> {
		const arrayBuffer = await file.arrayBuffer();
		const decoded = await decodeArrayBuffer({ arrayBuffer, audioContext });
		return new FallbackAudioBufferSink(decoded);
	}

	get sampleRate(): number {
		return this.decoded.sampleRate;
	}

	get numberOfChannels(): number {
		return this.decoded.numberOfChannels;
	}

	get duration(): number {
		return this.decoded.duration;
	}

	// eslint-disable-next-line opencut/prefer-object-params -- mirrors mediabunny's AudioBufferSink.buffers(start, end) so consumers can swap sinks transparently
	async *buffers(
		startTimestamp = 0,
		endTimestamp?: number,
	): AsyncGenerator<WrappedAudioBuffer, void, unknown> {
		const totalDuration = this.decoded.duration;
		const safeStart = Number.isFinite(startTimestamp) ? startTimestamp : 0;
		const start = Math.max(0, Math.min(safeStart, totalDuration));
		const end =
			typeof endTimestamp === "number" && Number.isFinite(endTimestamp)
				? Math.min(endTimestamp, totalDuration)
				: totalDuration;
		if (start >= end) return;

		const sliced = sliceAudioBuffer({
			buffer: this.decoded,
			start,
			end,
		});

		yield {
			buffer: sliced,
			timestamp: start,
			duration: sliced.duration,
		};
	}
}

function decodeArrayBuffer({
	arrayBuffer,
	audioContext,
}: {
	arrayBuffer: ArrayBuffer;
	audioContext: BaseAudioContext;
}): Promise<AudioBuffer> {
	return new Promise<AudioBuffer>((resolve, reject) => {
		audioContext.decodeAudioData(
			arrayBuffer,
			(buffer) => resolve(buffer),
			(err) =>
				reject(
					err instanceof Error
						? err
						: new Error(`decodeAudioData failed: ${String(err)}`),
				),
		);
	});
}

export function sliceAudioBuffer({
	buffer,
	start,
	end,
}: {
	buffer: AudioBuffer;
	start: number;
	end: number;
}): AudioBuffer {
	const sampleRate = buffer.sampleRate;
	const startSample = Math.max(
		0,
		Math.min(buffer.length, Math.floor(start * sampleRate)),
	);
	const endSample = Math.max(
		startSample,
		Math.min(buffer.length, Math.ceil(end * sampleRate)),
	);
	const length = Math.max(1, endSample - startSample);

	const target = new AudioBuffer({
		length,
		numberOfChannels: Math.max(1, buffer.numberOfChannels),
		sampleRate,
	});
	for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
		const channelView = buffer
			.getChannelData(channel)
			.subarray(startSample, endSample);
		target.copyToChannel(channelView, channel, 0);
	}
	return target;
}
