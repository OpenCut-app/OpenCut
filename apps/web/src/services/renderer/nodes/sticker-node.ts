import type { CanvasRenderer } from "../canvas-renderer";
import { resolveStickerId } from "@/lib/stickers";
import { VisualNode, type VisualNodeParams } from "./visual-node";

export interface StickerNodeParams extends VisualNodeParams {
	stickerId: string;
}

export class StickerNode extends VisualNode<StickerNodeParams> {
	private image?: HTMLImageElement;
	private readyPromise: Promise<void>;

	constructor(params: StickerNodeParams) {
		super(params);
		this.readyPromise = this.load();
	}

	private async load() {
		const image = new Image();
		this.image = image;
		const url = resolveStickerId({
			stickerId: this.params.stickerId,
			options: { width: 200, height: 200 },
		});

		await new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () =>
				reject(new Error(`Failed to load sticker: ${this.params.stickerId}`));
			image.src = url;
		});
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange(time)) {
			return;
		}

		await this.readyPromise;

		if (!this.image) {
			return;
		}

		this.renderVisual({
			renderer,
			source: this.image,
			sourceWidth: 200,
			sourceHeight: 200,
		});
	}
}
