import type { CanvasRenderer } from "../canvas-renderer";
import { VisualNode, type VisualNodeParams } from "./visual-node";

export interface ImageNodeParams extends VisualNodeParams {
	url: string;
	maxSourceSize?: number;
}

interface CachedImageSource {
	source: HTMLImageElement | OffscreenCanvas;
	width: number;
	height: number;
}

const imageSourceCache = new Map<string, Promise<CachedImageSource>>();

function loadImageSource(
	url: string,
	maxSourceSize?: number,
): Promise<CachedImageSource> {
	const cacheKey = `${url}::${maxSourceSize ?? "full"}`;

	const cached = imageSourceCache.get(cacheKey);
	if (cached) return cached;

	const promise = (async (): Promise<CachedImageSource> => {
		const image = new Image();

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("Image load failed"));
			image.src = url;
		});

		const naturalWidth = image.naturalWidth;
		const naturalHeight = image.naturalHeight;
		const exceedsLimit =
			maxSourceSize &&
			(naturalWidth > maxSourceSize || naturalHeight > maxSourceSize);

		if (exceedsLimit) {
			const scale = Math.min(
				maxSourceSize / naturalWidth,
				maxSourceSize / naturalHeight,
			);
			const scaledWidth = Math.round(naturalWidth * scale);
			const scaledHeight = Math.round(naturalHeight * scale);

			const offscreen = new OffscreenCanvas(scaledWidth, scaledHeight);
			const ctx = offscreen.getContext("2d");

			if (ctx) {
				ctx.drawImage(image, 0, 0, scaledWidth, scaledHeight);
				return { source: offscreen, width: scaledWidth, height: scaledHeight };
			}
		}

		return { source: image, width: naturalWidth, height: naturalHeight };
	})();

	imageSourceCache.set(cacheKey, promise);
	return promise;
}

export class ImageNode extends VisualNode<ImageNodeParams> {
	private cachedSource: Promise<CachedImageSource>;

	constructor(params: ImageNodeParams) {
		super(params);
		this.cachedSource = loadImageSource(params.url, params.maxSourceSize);
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange(time)) {
			return;
		}

		const { source, width, height } = await this.cachedSource;

		this.renderVisual({
			renderer,
			source,
			sourceWidth: width || renderer.width,
			sourceHeight: height || renderer.height,
		});
	}
}
