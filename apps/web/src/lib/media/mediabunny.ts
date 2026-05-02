import { Input, ALL_FORMATS, BlobSource, AudioBufferSink } from "mediabunny";
import { createTimelineAudioBuffer } from "@/lib/media/audio";
import type { SceneTracks } from "@/lib/timeline";
import type { MediaAsset } from "@/lib/media/types";
import { TICKS_PER_SECOND } from "@/lib/wasm";

export async function getVideoInfo({
	videoFile,
}: {
	videoFile: File;
}): Promise<{
	duration: number;
	width: number;
	height: number;
	fps: number;
	hasAudio: boolean;
}> {
	const input = new Input({
		source: new BlobSource(videoFile),
		formats: ALL_FORMATS,
	});

	const duration = await input.computeDuration();
	const videoTrack = await input.getPrimaryVideoTrack();

	if (!videoTrack) {
		throw new Error("No video track found in the file");
	}

	const packetStats = await videoTrack.computePacketStats(100);
	const fps = packetStats.averagePacketRate;
	const audioTrack = await input.getPrimaryAudioTrack();

	return {
		duration,
		width: videoTrack.displayWidth,
		height: videoTrack.displayHeight,
		fps,
		hasAudio: audioTrack !== null,
	};
}

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 2;
const EMPTY_TIMELINE_SILENT_DURATION_SECONDS = 0.1;
const MIN_SILENT_DURATION_SECONDS = 0.001;

export async function extractAssetAudio({
	file,
	assetType,
}: {
	file: File;
	assetType: string;
}): Promise<Blob> {
	if (assetType === "audio") {
		return file;
	}

	const input = new Input({
		source: new BlobSource(file),
		formats: ALL_FORMATS,
	});

	try {
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) {
			throw new Error("Asset has no audio track");
		}

		const sink = new AudioBufferSink(audioTrack);
		const chunks: AudioBuffer[] = [];
		let totalSamples = 0;

		for await (const { buffer } of sink.buffers(0)) {
			chunks.push(buffer);
			totalSamples += buffer.length;
		}

		if (chunks.length === 0 || totalSamples === 0) {
			throw new Error("Could not extract audio from asset");
		}

		return createWavBlob({
			samples: interleaveAudioChunks({ chunks, totalSamples }),
			sampleRate: chunks[0].sampleRate,
		});
	} finally {
		input.dispose();
	}
}

export const extractTimelineAudio = async ({
	tracks,
	mediaAssets,
	totalDuration,
	onProgress,
}: {
	tracks: SceneTracks;
	mediaAssets: MediaAsset[];
	totalDuration: number;
	onProgress?: (progress: number) => void;
}): Promise<Blob> => {
	if (totalDuration === 0) {
		return createWavBlob({
			samples: new Float32Array(
				SAMPLE_RATE * EMPTY_TIMELINE_SILENT_DURATION_SECONDS,
			),
		});
	}

	onProgress?.(10);

	const audioBuffer = await createTimelineAudioBuffer({
		tracks,
		mediaAssets,
		duration: totalDuration,
		sampleRate: SAMPLE_RATE,
	});

	if (!audioBuffer) {
		const silentDurationSeconds = Math.max(
			MIN_SILENT_DURATION_SECONDS,
			totalDuration / TICKS_PER_SECOND,
		);
		const silentSamples = new Float32Array(
			Math.ceil(silentDurationSeconds * SAMPLE_RATE) * NUM_CHANNELS,
		);
		return createWavBlob({ samples: silentSamples });
	}

	onProgress?.(90);

	const interleavedSamples = interleaveAudioBuffer({ audioBuffer });
	onProgress?.(100);

	return createWavBlob({ samples: interleavedSamples });
};

function interleaveAudioBuffer({
	audioBuffer,
}: {
	audioBuffer: AudioBuffer;
}): Float32Array {
	const numChannels = Math.min(NUM_CHANNELS, audioBuffer.numberOfChannels);
	const interleavedSamples = new Float32Array(
		audioBuffer.length * NUM_CHANNELS,
	);

	for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex++) {
		for (let channel = 0; channel < NUM_CHANNELS; channel++) {
			const sourceChannel = Math.min(channel, Math.max(0, numChannels - 1));
			interleavedSamples[sampleIndex * NUM_CHANNELS + channel] =
				audioBuffer.getChannelData(sourceChannel)[sampleIndex] ?? 0;
		}
	}

	return interleavedSamples;
}

function interleaveAudioChunks({
	chunks,
	totalSamples,
}: {
	chunks: AudioBuffer[];
	totalSamples: number;
}): Float32Array {
	const interleavedSamples = new Float32Array(totalSamples * NUM_CHANNELS);
	let outputSampleIndex = 0;

	for (const chunk of chunks) {
		const numChannels = Math.min(NUM_CHANNELS, chunk.numberOfChannels);
		for (let sampleIndex = 0; sampleIndex < chunk.length; sampleIndex++) {
			for (let channel = 0; channel < NUM_CHANNELS; channel++) {
				const sourceChannel = Math.min(channel, Math.max(0, numChannels - 1));
				interleavedSamples[outputSampleIndex * NUM_CHANNELS + channel] =
					chunk.getChannelData(sourceChannel)[sampleIndex] ?? 0;
			}
			outputSampleIndex++;
		}
	}

	return interleavedSamples;
}

function createWavBlob({
	samples,
	sampleRate = SAMPLE_RATE,
}: {
	samples: Float32Array;
	sampleRate?: number;
}): Blob {
	const numChannels = NUM_CHANNELS;
	const bitsPerSample = 16;
	const bytesPerSample = bitsPerSample / 8;
	const numSamples = samples.length / numChannels;
	const dataSize = numSamples * numChannels * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// riff header
	writeString({ view, offset: 0, str: "RIFF" });
	view.setUint32(4, 36 + dataSize, true);
	writeString({ view, offset: 8, str: "WAVE" });

	// fmt chunk
	writeString({ view, offset: 12, str: "fmt " });
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, numChannels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
	view.setUint16(32, numChannels * bytesPerSample, true);
	view.setUint16(34, bitsPerSample, true);

	// data chunk
	writeString({ view, offset: 36, str: "data" });
	view.setUint32(40, dataSize, true);

	// convert float32 to int16 and write
	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const sample = Math.max(-1, Math.min(1, samples[i]));
		const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
		view.setInt16(offset, int16, true);
		offset += 2;
	}

	return new Blob([buffer], { type: "audio/wav" });
}

function writeString({
	view,
	offset,
	str,
}: {
	view: DataView;
	offset: number;
	str: string;
}): void {
	for (let i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}
