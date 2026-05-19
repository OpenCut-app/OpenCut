import type { WrappedCanvas } from "mediabunny";

const DEFAULT_FALLBACK_FPS = 30;
const MAX_FALLBACK_FPS = 60;
const MIN_FALLBACK_FPS = 1;

export interface FrameSink {
	canvases(
		startTimestamp?: number,
		endTimestamp?: number,
	): AsyncGenerator<WrappedCanvas, void, unknown>;
}

export interface VideoElementHandle {
	readonly duration: number;
	readonly videoWidth: number;
	readonly videoHeight: number;
	seek(time: number): Promise<void>;
	drawTo(target: {
		canvas: HTMLCanvasElement | OffscreenCanvas;
		ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	}): void;
	dispose(): void;
}

export function isWebCodecsAvailable(): boolean {
	return typeof (globalThis as { VideoDecoder?: unknown }).VideoDecoder !==
		"undefined";
}

export function clampFallbackFps(requested: number | undefined): number {
	if (
		requested === undefined ||
		!Number.isFinite(requested) ||
		requested <= 0
	) {
		return DEFAULT_FALLBACK_FPS;
	}
	const rounded = Math.round(requested);
	if (rounded < MIN_FALLBACK_FPS) return MIN_FALLBACK_FPS;
	if (rounded > MAX_FALLBACK_FPS) return MAX_FALLBACK_FPS;
	return rounded;
}

export async function createHTMLVideoElementHandle({
	file,
}: {
	file: File;
}): Promise<VideoElementHandle> {
	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement("video");
	video.preload = "auto";
	video.muted = true;
	video.playsInline = true;
	video.crossOrigin = "anonymous";
	video.src = objectUrl;

	try {
		await waitForLoadedMetadata({ video });
	} catch (error) {
		URL.revokeObjectURL(objectUrl);
		throw error;
	}

	let disposed = false;

	return {
		get duration() {
			return video.duration;
		},
		get videoWidth() {
			return video.videoWidth;
		},
		get videoHeight() {
			return video.videoHeight;
		},
		async seek(time) {
			if (disposed) {
				throw new Error("VideoElementHandle disposed");
			}
			await seekVideoElement({ video, time });
		},
		drawTo({ canvas, ctx }) {
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			try {
				video.pause();
			} catch {
				// ignore
			}
			video.removeAttribute("src");
			try {
				video.load();
			} catch {
				// ignore
			}
			URL.revokeObjectURL(objectUrl);
		},
	};
}

function waitForLoadedMetadata({
	video,
}: {
	video: HTMLVideoElement;
}): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			video.removeEventListener("loadedmetadata", onLoaded);
			video.removeEventListener("error", onError);
		};
		const onLoaded = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			const msg = video.error?.message ?? "unknown error";
			reject(new Error(`HTMLVideoElement load failed: ${msg}`));
		};
		video.addEventListener("loadedmetadata", onLoaded);
		video.addEventListener("error", onError);
	});
}

function seekVideoElement({
	video,
	time,
}: {
	video: HTMLVideoElement;
	time: number;
}): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		const cleanup = () => {
			video.removeEventListener("seeked", onSeeked);
			video.removeEventListener("error", onError);
		};
		const onSeeked = () => {
			cleanup();
			resolve();
		};
		const onError = () => {
			cleanup();
			reject(new Error("HTMLVideoElement seek failed"));
		};
		video.addEventListener("seeked", onSeeked);
		video.addEventListener("error", onError);
		try {
			video.currentTime = time;
		} catch (err) {
			cleanup();
			reject(err instanceof Error ? err : new Error(String(err)));
		}
	});
}

export class HTMLVideoElementSink implements FrameSink {
	private disposed = false;
	private readonly handle: VideoElementHandle;
	private readonly fps: number;

	constructor({
		handle,
		fps,
	}: {
		handle: VideoElementHandle;
		fps?: number;
	}) {
		this.handle = handle;
		this.fps = clampFallbackFps(fps);
	}

	static async create({
		file,
		fps,
	}: {
		file: File;
		fps?: number;
	}): Promise<HTMLVideoElementSink> {
		const handle = await createHTMLVideoElementHandle({ file });
		return new HTMLVideoElementSink({ handle, fps: clampFallbackFps(fps) });
	}

	// eslint-disable-next-line opencut/prefer-object-params -- mirrors mediabunny's CanvasSink.canvases(start, end) so VideoCache can use either sink transparently
	async *canvases(
		startTimestamp = 0,
		endTimestamp?: number,
	): AsyncGenerator<WrappedCanvas, void, unknown> {
		const step = 1 / this.fps;
		const duration = this.handle.duration;
		const end =
			typeof endTimestamp === "number" && Number.isFinite(endTimestamp)
				? Math.min(endTimestamp, duration)
				: duration;
		let t = Math.max(0, startTimestamp);

		while (t < end && !this.disposed) {
			try {
				await this.handle.seek(t);
			} catch (error) {
				console.warn("[HTMLVideoElementSink] seek failed:", error);
				return;
			}
			if (this.disposed) return;

			const canvas = createFrameCanvas({
				width: this.handle.videoWidth,
				height: this.handle.videoHeight,
			});
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				console.warn(
					"[HTMLVideoElementSink] 2d context unavailable, aborting iterator",
				);
				return;
			}
			this.handle.drawTo({ canvas, ctx });

			yield {
				canvas,
				timestamp: t,
				duration: step,
			};
			t += step;
		}
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.handle.dispose();
	}
}

function createFrameCanvas({
	width,
	height,
}: {
	width: number;
	height: number;
}): HTMLCanvasElement {
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(width));
	canvas.height = Math.max(1, Math.round(height));
	return canvas;
}
