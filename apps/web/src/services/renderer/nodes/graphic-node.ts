import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import {
	DEFAULT_GRAPHIC_SOURCE_SIZE,
	getGraphicDefinition,
	registerDefaultGraphics,
} from "@/lib/graphics";
import { resolveGraphicParamsAtTime } from "@/lib/animation";
import type { ParamValues } from "@/lib/params";
import { VisualNode, type VisualNodeParams } from "./visual-node";

export interface GraphicNodeParams extends VisualNodeParams {
	definitionId: string;
	params: ParamValues;
}

export class GraphicNode extends VisualNode<GraphicNodeParams> {
	private cachedKey: string | null = null;
	private cachedSource: OffscreenCanvas | HTMLCanvasElement | null = null;

	constructor(params: GraphicNodeParams) {
		super(params);
		registerDefaultGraphics();
	}

	private getSource({
		localTime,
	}: {
		localTime: number;
	}): OffscreenCanvas | HTMLCanvasElement | null {
		const definition = getGraphicDefinition({
			definitionId: this.params.definitionId,
		});
		const resolvedParams = resolveGraphicParamsAtTime({
			element: this.params,
			localTime,
		});
		const cacheKey = JSON.stringify({
			definitionId: this.params.definitionId,
			params: resolvedParams,
		});
		if (this.cachedSource && this.cachedKey === cacheKey) {
			return this.cachedSource;
		}

		const canvas = createOffscreenCanvas({
			width: DEFAULT_GRAPHIC_SOURCE_SIZE,
			height: DEFAULT_GRAPHIC_SOURCE_SIZE,
		});
		const ctx = canvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!ctx) {
			return null;
		}

		definition.render({
			ctx,
			params: resolvedParams,
			width: DEFAULT_GRAPHIC_SOURCE_SIZE,
			height: DEFAULT_GRAPHIC_SOURCE_SIZE,
		});

		this.cachedKey = cacheKey;
		this.cachedSource = canvas;
		return canvas;
	}

	async render({ renderer, time }: { renderer: CanvasRenderer; time: number }) {
		await super.render({ renderer, time });

		if (!this.isInRange({ time })) {
			return;
		}

		const source = this.getSource({
			localTime: this.getAnimationLocalTime({ time }),
		});
		if (!source) {
			return;
		}

		await this.renderVisual({
			renderer,
			source,
			sourceWidth: DEFAULT_GRAPHIC_SOURCE_SIZE,
			sourceHeight: DEFAULT_GRAPHIC_SOURCE_SIZE,
			timelineTime: time,
		});
	}
}
