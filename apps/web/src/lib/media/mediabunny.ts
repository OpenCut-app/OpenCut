import { Input, ALL_FORMATS, BlobSource, AudioBufferSink } from "mediabunny";
import { collectAudioMixSources } from "@/lib/media/audio";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaAsset } from "@/types/assets";

export async function getVideoInfo({
	videoFile,
}: {
	videoFile: File;
}): Promise<{
	duration: number;
	width: number;
	height: number;
	fps: number;
}> {
	const input = new Input({
		source: new BlobSource(videoFile),
		formats: ALL_FORMATS,
	});

	try {
		const duration = await input.computeDuration();
		const videoTrack = await input.getPrimaryVideoTrack();

		if (!videoTrack) {
			throw new Error("No video track found in the file");
		}

		const packetStats = await videoTrack.computePacketStats(100);
		const fps = packetStats.averagePacketRate;

		return {
			duration,
			width: videoTrack.displayWidth,
			height: videoTrack.displayHeight,
			fps,
		};
	} finally {
		input.dispose();
	}
}

const SAMPLE_RATE = 44100;
const NUM_CHANNELS = 2;

export const extractTimelineAudio = async ({
	tracks,
	mediaAssets,
	totalDuration,
	onProgress,
}: {
	tracks: TimelineTrack[];
	mediaAssets: MediaAsset[];
	totalDuration: number;
	onProgress?: (progress: number) => void;
}): Promise<Blob> => {
	if (totalDuration === 0) {
		return createWavBlob({ samples: new Float32Array(SAMPLE_RATE * 0.1) });
	}

	const audioMixSources = await collectAudioMixSources({
		tracks,
		mediaAssets,
	});

	if (audioMixSources.length === 0) {
		const silentDuration = Math.max(1, totalDuration);
		const silentSamples = new Float32Array(
			Math.ceil(silentDuration * SAMPLE_RATE) * NUM_CHANNELS,
		);
		return createWavBlob({ samples: silentSamples });
	}

	const totalSamples = Math.ceil(totalDuration * SAMPLE_RATE);
	const mixBuffers = [
		new Float32Array(totalSamples),
		new Float32Array(totalSamples),
	];

	for (let i = 0; i < audioMixSources.length; i++) {
		const source = audioMixSources[i];

		if (onProgress) {
			onProgress((i / audioMixSources.length) * 90);
		}

		try {
			await decodeAndMixAudioSource({
				source,
				mixBuffers,
				totalSamples,
			});
		} catch (error) {
			console.warn(
				`Failed to process audio source ${source.file.name}:`,
				error,
			);
		}
	}

	// clamp to prevent clipping
	for (const channel of mixBuffers) {
		for (let i = 0; i < channel.length; i++) {
			channel[i] = Math.max(-1, Math.min(1, channel[i]));
		}
	}

	// interleave channels for wav output
	const interleavedSamples = new Float32Array(totalSamples * NUM_CHANNELS);
	for (let i = 0; i < totalSamples; i++) {
		interleavedSamples[i * 2] = mixBuffers[0][i];
		interleavedSamples[i * 2 + 1] = mixBuffers[1][i];
	}

	if (onProgress) {
		onProgress(100);
	}

	return createWavBlob({ samples: interleavedSamples });
};

async function decodeAndMixAudioSource({
	source,
	mixBuffers,
	totalSamples,
}: {
	source: {
		file: File;
		startTime: number;
		duration: number;
		trimStart: number;
	};
	mixBuffers: Float32Array[];
	totalSamples: number;
}): Promise<void> {
	const input = new Input({
		source: new BlobSource(source.file),
		formats: ALL_FORMATS,
	});

	try {
		const audioTrack = await input.getPrimaryAudioTrack();
		if (!audioTrack) return;

		const sink = new AudioBufferSink(audioTrack);
		const trimEnd = source.trimStart + source.duration;

		for await (const { buffer, timestamp } of sink.buffers(
			source.trimStart,
			trimEnd,
		)) {
			const relativeTime = timestamp - source.trimStart;
			const outputStartSample = Math.floor(
				(source.startTime + relativeTime) * SAMPLE_RATE,
			);

			// resample if needed
			const resampleRatio = SAMPLE_RATE / buffer.sampleRate;

			for (let ch = 0; ch < NUM_CHANNELS; ch++) {
				const sourceChannel = Math.min(ch, buffer.numberOfChannels - 1);
				const channelData = buffer.getChannelData(sourceChannel);
				const outputChannel = mixBuffers[ch];

				const resampledLength = Math.floor(channelData.length * resampleRatio);
				for (let i = 0; i < resampledLength; i++) {
					const outputIdx = outputStartSample + i;
					if (outputIdx < 0 || outputIdx >= totalSamples) continue;

					const sourceIdx = Math.floor(i / resampleRatio);
					if (sourceIdx < channelData.length) {
						outputChannel[outputIdx] += channelData[sourceIdx];
					}
				}
			}
		}
	} finally {
		input.dispose();
	}
}

function createWavBlob({ samples }: { samples: Float32Array }): Blob {
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
	view.setUint32(24, SAMPLE_RATE, true);
	view.setUint32(28, SAMPLE_RATE * numChannels * bytesPerSample, true);
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
