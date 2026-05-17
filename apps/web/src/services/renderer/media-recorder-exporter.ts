import type { FrameRate } from "opencut-wasm";
import { TICKS_PER_SECOND } from "@/wasm";
import { frameRateToFloat } from "@/fps/utils";
import type { RootNode } from "./nodes/root-node";
import type { CanvasRenderer } from "./canvas-renderer";
import { detectMediaRecorderSupport } from "./media-recorder-support";

export {
	detectMediaRecorderSupport,
	isWebCodecsExportSupported,
} from "./media-recorder-support";
export type { MediaRecorderSupport } from "./media-recorder-support";

/**
 * MediaRecorder-based exporter used when WebCodecs encoders
 * (VideoEncoder / AudioEncoder) are not available in the current browser.
 *
 * Captures the renderer's output canvas via `canvas.captureStream(fps)` and
 * mixes the project audio buffer through a `MediaStreamAudioDestinationNode`.
 * The combined MediaStream is recorded with `MediaRecorder`, producing a
 * WebM blob (which `<video>` can play natively on the same browser without
 * WebCodecs).
 *
 * Trade-offs vs. the WebCodecs path:
 *  - Output is always WebM (most browsers don't expose an MP4 muxer in
 *    MediaRecorder). The caller's requested format is honoured best-effort
 *    but a WebM container is the realistic floor.
 *  - The renderer is driven at real time, so a 60-second timeline takes
 *    ~60 seconds to export.
 */
export interface MediaRecorderExportParams {
	renderer: CanvasRenderer;
	rootNode: RootNode;
	fps: FrameRate;
	bitrate: number;
	audioBuffer?: AudioBuffer | null;
	onProgress?: (progress: number) => void;
	signal?: { cancelled: boolean };
}

export async function exportWithMediaRecorder({
	renderer,
	rootNode,
	fps,
	bitrate,
	audioBuffer,
	onProgress,
	signal,
}: MediaRecorderExportParams): Promise<ArrayBuffer | null> {
	const support = detectMediaRecorderSupport();
	if (!support.supported || !support.mimeType) {
		throw new Error(
			"MediaRecorder is not available in this browser, so export is not supported.",
		);
	}

	const fpsFloat = frameRateToFloat(fps);
	const ticksPerFrame = Math.round(
		(TICKS_PER_SECOND * fps.denominator) / fps.numerator,
	);
	const frameCount = Math.max(1, Math.floor(rootNode.duration / ticksPerFrame));

	const canvas = renderer.getOutputCanvas();
	const videoStream = canvas.captureStream(fpsFloat);
	const combinedStream = new MediaStream();
	for (const track of videoStream.getVideoTracks()) {
		combinedStream.addTrack(track);
	}

	const audioGraph = audioBuffer
		? createAudioGraphForStream({ audioBuffer })
		: null;
	if (audioGraph) {
		for (const track of audioGraph.stream.getAudioTracks()) {
			combinedStream.addTrack(track);
		}
	}

	const recorder = new MediaRecorder(combinedStream, {
		mimeType: support.mimeType,
		videoBitsPerSecond: bitrate,
	});

	const chunks: Blob[] = [];
	recorder.addEventListener("dataavailable", (event) => {
		if (event.data && event.data.size > 0) {
			chunks.push(event.data);
		}
	});

	const recordingFinished = new Promise<Blob>((resolve, reject) => {
		recorder.addEventListener("stop", () => {
			resolve(new Blob(chunks, { type: support.mimeType ?? "video/webm" }));
		});
		recorder.addEventListener("error", () => {
			reject(new Error("MediaRecorder failed during export."));
		});
	});

	try {
		recorder.start();

		// Kick off audio playback into the destination node at the same wall-clock
		// moment as the renderer loop so the captured stream is aligned.
		if (audioGraph) {
			audioGraph.start();
		}

		const startedAt = performance.now();
		for (let frame = 0; frame < frameCount; frame++) {
			if (signal?.cancelled) {
				recorder.stop();
				await recordingFinished.catch(() => null);
				return null;
			}

			const targetWallTimeMs = startedAt + (frame * 1000) / fpsFloat;
			const waitMs = targetWallTimeMs - performance.now();
			if (waitMs > 0) {
				await sleep({ ms: waitMs });
			}

			const timeTicks = frame * ticksPerFrame;
			await renderer.render({ node: rootNode, time: timeTicks });

			onProgress?.(frame / frameCount);
		}

		// Give the recorder a moment to flush the last frames after rendering ends.
		await sleep({ ms: 250 });
		recorder.stop();
		onProgress?.(1);

		const blob = await recordingFinished;
		if (!blob) return null;
		return await blob.arrayBuffer();
	} finally {
		if (audioGraph) {
			audioGraph.dispose();
		}
		for (const track of combinedStream.getTracks()) {
			track.stop();
		}
	}
}

interface AudioGraph {
	stream: MediaStream;
	start: () => void;
	dispose: () => void;
}

function createAudioGraphForStream({
	audioBuffer,
}: {
	audioBuffer: AudioBuffer;
}): AudioGraph {
	const audioContext = new AudioContext({
		sampleRate: audioBuffer.sampleRate,
	});
	const destination = audioContext.createMediaStreamDestination();
	const source = audioContext.createBufferSource();
	source.buffer = audioBuffer;
	source.connect(destination);

	let started = false;
	let disposed = false;

	return {
		stream: destination.stream,
		start() {
			if (started || disposed) return;
			started = true;
			source.start(0);
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			try {
				source.stop();
			} catch {
				// already stopped
			}
			source.disconnect();
			destination.disconnect();
			void audioContext.close();
		},
	};
}

function sleep({ ms }: { ms: number }): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
