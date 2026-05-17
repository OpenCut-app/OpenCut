/**
 * Lightweight feature-detection helpers for the MediaRecorder-based export
 * fallback. Kept dependency-free so unit tests don't drag in WASM modules.
 */

export interface MediaRecorderSupport {
	supported: boolean;
	mimeType: string | null;
}

const MEDIA_RECORDER_CANDIDATE_MIME_TYPES = [
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm",
] as const;

export function detectMediaRecorderSupport(): MediaRecorderSupport {
	if (typeof MediaRecorder === "undefined") {
		return { supported: false, mimeType: null };
	}
	for (const candidate of MEDIA_RECORDER_CANDIDATE_MIME_TYPES) {
		if (MediaRecorder.isTypeSupported(candidate)) {
			return { supported: true, mimeType: candidate };
		}
	}
	return { supported: false, mimeType: null };
}

export function isWebCodecsExportSupported(): boolean {
	const root = globalThis as {
		VideoEncoder?: unknown;
		AudioEncoder?: unknown;
	};
	return (
		typeof root.VideoEncoder !== "undefined" &&
		typeof root.AudioEncoder !== "undefined"
	);
}
