import type { CanvasRenderer } from "../canvas-renderer";
import { resolveStickerId } from "@/lib/stickers";
import { VisualNode, type VisualNodeParams } from "./visual-node";

export interface StickerNodeParams extends VisualNodeParams {
	stickerId: string;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}

interface CachedStickerSource {
	source: HTMLImageElement;
	width: number;
	height: number;
}

const stickerSourceCache = new Map<string, Promise<CachedStickerSource>>();

function loadStickerSource({ stickerId }: { stickerId: string }): Promise<CachedStickerSource> {
	const cached = stickerSourceCache.get(stickerId);
	if (cached) return cached;

	const promise = (async (): Promise<CachedStickerSource> => {
		const url = resolveStickerId({
			stickerId,
			options: { width: 200, height: 200 },
		});

		const image = new Image();

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () =>
				reject(new Error(`Failed to load sticker: ${stickerId}`));
			image.src = url;
		});

		return { source: image, width: image.naturalWidth, height: image.naturalHeight };
	})();

	stickerSourceCache.set(stickerId, promise);
	return promise;
}

export class StickerNode extends VisualNode<StickerNodeParams> {
	private cachedSource: Promise<CachedStickerSource>;

	constructor(params: StickerNodeParams) {
		super(params);
		this.cachedSource = loadStickerSource({ stickerId: params.stickerId });
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange({ time })) {
			return;
		}

		const { source, width: loadedWidth, height: loadedHeight } =
			await this.cachedSource;

		// Prefer element-stored intrinsic dimensions as the geometry authority.
		// The loaded image is only the drawable source.
		const sourceWidth = this.params.intrinsicWidth ?? loadedWidth;
		const sourceHeight = this.params.intrinsicHeight ?? loadedHeight;

		await this.renderVisual({
			renderer,
			source,
			sourceWidth,
			sourceHeight,
			timelineTime: time,
		});
	}
}
