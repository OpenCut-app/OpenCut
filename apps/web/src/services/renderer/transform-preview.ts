import { createOffscreenCanvas } from "./canvas-utils";
import { transformsRegistry } from "@/lib/transforms";
import { buildDefaultParamValues } from "@/lib/registry";
import type { ParamValues } from "@/lib/params";
import { applyMultiPassEffect } from "./webgl/webgl-utils";
import type { EffectPassData } from "./webgl/webgl-utils";

const PREVIEW_SIZE = 160;
const PREVIEW_IMAGE_PATH = "/effects/preview.jpg";

/**
 * Renders a small preview thumbnail for a transform definition, applying
 * it to a static test image. Mirrors `EffectPreviewService`
 * (`services/renderer/effect-preview.ts`) — spatial transforms render via
 * Canvas2D, webgl (visual) transforms render via the shared multi-pass
 * WebGL utilities. Transitions have no single-source preview and fall
 * back to showing the unmodified source image.
 */
class TransformPreviewService {
	private previewGl: WebGLRenderingContext | null = null;
	private previewCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private testSourceCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
	private previewImageElement: HTMLImageElement | null = null;
	private programCache = new Map<string, WebGLProgram>();
	private onReadyCallbacks = new Set<() => void>();

	readonly PREVIEW_SIZE = PREVIEW_SIZE;

	constructor() {
		this.loadPreviewImage();
	}

	onPreviewImageReady({ callback }: { callback: () => void }): () => void {
		this.onReadyCallbacks.add(callback);
		return () => this.onReadyCallbacks.delete(callback);
	}

	renderPreview({
		transformType,
		params,
		targetCanvas,
	}: {
		transformType: string;
		params: ParamValues;
		targetCanvas: HTMLCanvasElement;
	}): void {
		const size = PREVIEW_SIZE;
		const source = this.getTestSource({ width: size, height: size });
		if (!source) return;

		const definition = transformsRegistry.get(transformType);
		const resolvedParams =
			Object.keys(params).length > 0
				? params
				: buildDefaultParamValues(definition.params);

		let result: OffscreenCanvas | HTMLCanvasElement;

		if (definition.renderer.type === "spatial") {
			result = this.applySpatialTransform({
				source,
				width: size,
				height: size,
				transformType,
				params: resolvedParams,
			});
		} else if (definition.renderer.type === "webgl") {
			result = this.applyWebglTransform({
				source,
				width: size,
				height: size,
				transformType,
				params: resolvedParams,
			});
		} else {
			// Transitions have no single-source preview; show source as-is.
			result = source as OffscreenCanvas | HTMLCanvasElement;
		}

		const targetCtx = targetCanvas.getContext(
			"2d",
		) as CanvasRenderingContext2D | null;
		if (targetCtx) {
			targetCanvas.width = size;
			targetCanvas.height = size;
			targetCtx.drawImage(result, 0, 0, size, size);
		}
	}

	private loadPreviewImage(): void {
		if (typeof window === "undefined") return;
		const image = new Image();
		image.onload = () => {
			this.testSourceCanvas = null;
			for (const callback of this.onReadyCallbacks) {
				callback();
			}
		};
		image.src = PREVIEW_IMAGE_PATH;
		this.previewImageElement = image;
	}

	private createTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const isImageReady =
			this.previewImageElement?.complete &&
			(this.previewImageElement.naturalWidth ?? 0) > 0;
		if (!isImageReady || !this.previewImageElement) {
			return null;
		}

		const canvas = createOffscreenCanvas({ width, height });
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			throw new Error("failed to get 2d context for test source");
		}
		ctx.drawImage(this.previewImageElement, 0, 0, width, height);
		return canvas;
	}

	private getTestSource({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): CanvasImageSource | null {
		if (
			!this.testSourceCanvas ||
			this.testSourceCanvas.width !== width ||
			this.testSourceCanvas.height !== height
		) {
			this.testSourceCanvas = this.createTestSource({ width, height });
		}
		return this.testSourceCanvas;
	}

	private applySpatialTransform({
		source,
		width,
		height,
		transformType,
		params,
	}: {
		source: CanvasImageSource;
		width: number;
		height: number;
		transformType: string;
		params: ParamValues;
	}): OffscreenCanvas | HTMLCanvasElement {
		const definition = transformsRegistry.get(transformType);
		if (definition.renderer.type !== "spatial") {
			throw new Error(`Transform ${transformType} is not spatial`);
		}

		const outputCanvas = createOffscreenCanvas({ width, height });
		const ctx = outputCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			throw new Error("failed to get 2d context");
		}

		ctx.save();
		definition.renderer.apply({
			ctx: ctx as CanvasRenderingContext2D,
			transformParams: params,
			width,
			height,
		});
		ctx.drawImage(source, 0, 0, width, height);
		ctx.restore();

		return outputCanvas;
	}

	private getOrCreatePreviewContext({
		width,
		height,
	}: {
		width: number;
		height: number;
	}): {
		canvas: OffscreenCanvas | HTMLCanvasElement;
		gl: WebGLRenderingContext;
	} {
		if (!this.previewCanvas || !this.previewGl) {
			this.previewCanvas = createOffscreenCanvas({ width, height });
			this.previewGl = this.previewCanvas.getContext("webgl", {
				premultipliedAlpha: false,
			}) as WebGLRenderingContext | null;
			if (!this.previewGl) {
				throw new Error("WebGL not supported");
			}
		}
		if (
			this.previewCanvas.width !== width ||
			this.previewCanvas.height !== height
		) {
			this.previewCanvas.width = width;
			this.previewCanvas.height = height;
		}
		return { canvas: this.previewCanvas, gl: this.previewGl };
	}

	private applyWebglTransform({
		source,
		width,
		height,
		transformType,
		params,
	}: {
		source: CanvasImageSource;
		width: number;
		height: number;
		transformType: string;
		params: ParamValues;
	}): OffscreenCanvas | HTMLCanvasElement {
		const definition = transformsRegistry.get(transformType);
		if (definition.renderer.type !== "webgl") {
			throw new Error(`Transform ${transformType} is not a webgl transform`);
		}

		const { canvas: glCanvas, gl } = this.getOrCreatePreviewContext({
			width,
			height,
		});

		const passes: EffectPassData[] = [
			{
				fragmentShader: definition.renderer.fragmentShader,
				uniforms: definition.renderer.uniforms({
					transformParams: params,
					width,
					height,
				}),
			},
		];

		applyMultiPassEffect({
			context: gl,
			source,
			width,
			height,
			passes,
			programCache: this.programCache,
		});

		const outputCanvas = createOffscreenCanvas({ width, height });
		const outputCtx = outputCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (outputCtx) {
			outputCtx.drawImage(glCanvas, 0, 0, width, height);
		}
		return outputCanvas;
	}
}

export const transformPreviewService = new TransformPreviewService();
