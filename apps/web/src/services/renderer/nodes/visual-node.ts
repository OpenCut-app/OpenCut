import type { CanvasRenderer } from "../canvas-renderer";
import { BaseNode } from "./base-node";
import type { BlendMode } from "@/types/rendering";
import type { Transform } from "@/types/timeline";

const VISUAL_EPSILON = 1 / 1000;

export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	transform: Transform;
	opacity: number;
	blendMode?: BlendMode;
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
> extends BaseNode<Params> {
	protected getLocalTime(time: number): number {
		return time - this.params.timeOffset + this.params.trimStart;
	}

	protected isInRange(time: number): boolean {
		const localTime = this.getLocalTime(time);
		return (
			localTime >= this.params.trimStart - VISUAL_EPSILON &&
			localTime < this.params.trimStart + this.params.duration
		);
	}

	protected renderVisual({
		renderer,
		source,
		sourceWidth,
		sourceHeight,
	}: {
		renderer: CanvasRenderer;
		source: CanvasImageSource;
		sourceWidth: number;
		sourceHeight: number;
	}): void {
		renderer.context.save();

		const { transform, opacity } = this.params;
		const containScale = Math.min(
			renderer.width / sourceWidth,
			renderer.height / sourceHeight,
		);
		const scaledWidth = sourceWidth * containScale * transform.scale;
		const scaledHeight = sourceHeight * containScale * transform.scale;
		const x = renderer.width / 2 + transform.position.x - scaledWidth / 2;
		const y = renderer.height / 2 + transform.position.y - scaledHeight / 2;

		renderer.context.globalCompositeOperation = (
			this.params.blendMode && this.params.blendMode !== "normal"
				? this.params.blendMode
				: "source-over"
		) as GlobalCompositeOperation;
		renderer.context.globalAlpha = opacity;

		if (transform.rotate !== 0) {
			const centerX = x + scaledWidth / 2;
			const centerY = y + scaledHeight / 2;
			renderer.context.translate(centerX, centerY);
			renderer.context.rotate((transform.rotate * Math.PI) / 180);
			renderer.context.translate(-centerX, -centerY);
		}

		renderer.context.drawImage(source, x, y, scaledWidth, scaledHeight);
		renderer.context.restore();
	}
}
