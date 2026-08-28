import type { EffectContext } from "@/lib/effects/types";

/**
 * Face mesh detection provider using MediaPipe Face Mesh.
 * Lazy-loads the WASM module only when first needed.
 * Runs detection per frame and caches results.
 */

import type { FaceMesh as FaceMeshType, Results } from "@mediapipe/face_mesh";

let faceMeshInstance: FaceMeshType | null = null;
let isLoading = false;
/** Shared in-flight promise for pending detections — avoids race conditions */
let pendingDetection: Promise<Results> | null = null;
let pendingResolve: ((results: Results) => void) | null = null;
let pendingReject: ((error: Error) => void) | null = null;
let pendingTimeoutId: ReturnType<typeof setTimeout> | null = null;

/** Detection timeout in milliseconds */
const DETECTION_TIMEOUT_MS = 5000;

/** MediaPipe Face Mesh version — must match package.json dependency */
const MEDIAPIPE_VERSION = "0.4.1657299874";

/** Types that MediaPipe FaceMesh accepts */
type MediaPipeImageSource =
	| HTMLImageElement
	| HTMLCanvasElement
	| HTMLVideoElement;

/** Clear the pending timeout if it exists */
function clearPendingTimeout(): void {
	if (pendingTimeoutId !== null) {
		clearTimeout(pendingTimeoutId);
		pendingTimeoutId = null;
	}
}

/** Check if source is a valid MediaPipe image source */
function isMediaPipeImageSource(
	source: CanvasImageSource,
): source is MediaPipeImageSource {
	return (
		source instanceof HTMLImageElement ||
		source instanceof HTMLCanvasElement ||
		source instanceof HTMLVideoElement
	);
}

/** Convert OffscreenCanvas to HTMLCanvasElement for MediaPipe compatibility */
function toHTMLCanvas(source: OffscreenCanvas): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = source.width;
	canvas.height = source.height;
	const ctx = canvas.getContext("2d");
	if (ctx) {
		ctx.drawImage(source, 0, 0);
	}
	return canvas;
}

/** Prepare source for MediaPipe — converts OffscreenCanvas if needed */
function prepareSourceForMediaPipe(
	source: CanvasImageSource,
): MediaPipeImageSource | null {
	if (isMediaPipeImageSource(source)) {
		return source;
	}
	if (source instanceof OffscreenCanvas) {
		return toHTMLCanvas(source);
	}
	// ImageBitmap, SVGImageElement, VideoFrame are not supported
	return null;
}

/** Lazy-load MediaPipe Face Mesh WASM module */
async function loadFaceMesh(): Promise<FaceMeshType | null> {
	if (faceMeshInstance) return faceMeshInstance;
	if (isLoading) return null;

	isLoading = true;
	try {
		const { FaceMesh } = await import("@mediapipe/face_mesh");
		const fm = new FaceMesh({
			locateFile: (file: string) =>
				`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@${MEDIAPIPE_VERSION}/${file}`,
		});
		fm.setOptions({
			maxNumFaces: 1,
			refineLandmarks: true,
			minDetectionConfidence: 0.5,
			minTrackingConfidence: 0.5,
		});
		fm.onResults((results: Results) => {
			if (pendingResolve) {
				clearPendingTimeout();
				pendingResolve(results);
				pendingResolve = null;
				pendingReject = null;
			}
		});
		faceMeshInstance = fm;
		return fm;
	} catch {
		return null;
	} finally {
		isLoading = false;
	}
}

/** MediaPipe face landmark indices for key regions */
const LANDMARK_INDICES = {
	leftCheek: 234,
	rightCheek: 454,
	jawBottom: 152,
	jawLeft: 132,
	jawRight: 361,
	leftEyeCenter: 159,
	rightEyeCenter: 386,
	mouthCenter: 13,
};

/** Convert MediaPipe face landmarks to EffectContext */
function landmarksToContext(
	landmarks: Array<{ x: number; y: number; z: number }>,
): EffectContext {
	const lc = landmarks[LANDMARK_INDICES.leftCheek];
	const rc = landmarks[LANDMARK_INDICES.rightCheek];
	const jaw = landmarks[LANDMARK_INDICES.jawBottom];
	const jawL = landmarks[LANDMARK_INDICES.jawLeft];
	const jawR = landmarks[LANDMARK_INDICES.jawRight];

	// Estimate cheek radius from face width
	const faceWidth = Math.abs(rc.x - lc.x);
	const cheekRadius = faceWidth * 0.15;

	return {
		faceDetected: true,
		cheekLeft: [lc.x, lc.y],
		cheekRight: [rc.x, rc.y],
		cheekRadius,
		jawPoints: [jaw.x, jaw.y, jawL.x, jawL.y, jawR.x, jawR.y],
	};
}

/** Detect face in the given image source and return EffectContext */
export async function detectFace(
	source: CanvasImageSource,
): Promise<EffectContext> {
	const fm = await loadFaceMesh();
	if (!fm) {
		return { faceDetected: false };
	}

	// Convert source to MediaPipe-compatible format
	const mediaPipeSource = prepareSourceForMediaPipe(source);
	if (!mediaPipeSource) {
		// Source type not supported by MediaPipe
		return { faceDetected: false };
	}

	// Reuse existing in-flight detection if one exists
	if (pendingDetection) {
		const results = await pendingDetection;
		if (
			!results?.multiFaceLandmarks ||
			results.multiFaceLandmarks.length === 0
		) {
			return { faceDetected: false };
		}
		return landmarksToContext(results.multiFaceLandmarks[0]);
	}

	// Create new detection promise with timeout
	pendingDetection = new Promise<Results>((resolve, reject) => {
		pendingResolve = resolve;
		pendingReject = reject;

		// Set up timeout for detection
		pendingTimeoutId = setTimeout(() => {
			if (pendingReject) {
				pendingReject(new Error("Face detection timeout"));
				pendingResolve = null;
				pendingReject = null;
				pendingDetection = null;
				pendingTimeoutId = null;
			}
		}, DETECTION_TIMEOUT_MS);

		// Send image for detection, catching sync errors
		try {
			fm.send({ image: mediaPipeSource });
		} catch (error) {
			clearPendingTimeout();
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});

	let results: Results;
	try {
		results = await pendingDetection;
	} catch {
		// Detection failed (timeout or error) — return no face detected
		pendingDetection = null;
		pendingResolve = null;
		pendingReject = null;
		return { faceDetected: false };
	}

	clearPendingTimeout();
	pendingDetection = null;
	pendingResolve = null;
	pendingReject = null;

	if (!results?.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
		return { faceDetected: false };
	}

	return landmarksToContext(results.multiFaceLandmarks[0]);
}

/** Check if MediaPipe is loaded (for conditional rendering) */
export function isFaceMeshReady(): boolean {
	return faceMeshInstance !== null;
}

/** Clean up MediaPipe resources */
export function disposeFaceMesh(): void {
	// Clear timeout and settle any pending detection before disposing
	clearPendingTimeout();
	if (pendingReject) {
		pendingReject(new Error("Face mesh disposed"));
		pendingReject = null;
		pendingResolve = null;
		pendingDetection = null;
	}
	if (faceMeshInstance) {
		faceMeshInstance.close();
		faceMeshInstance = null;
	}
}
