import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { BaseNode } from "./base-node";
import type { Effect } from "@/lib/effects/types";
import type { Mask } from "@/lib/masks/types";
import type { BlendMode, Transform } from "@/lib/rendering";
import type { ElementAnimations } from "@/lib/animation/types";
import type { RetimeConfig } from "@/lib/timeline";
import {
	getElementLocalTime,
	resolveOpacityAtTime,
	resolveTransformAtTime,
} from "@/lib/animation";
import { resolveEffectParamsAtTime } from "@/lib/animation/effect-param-channel";
import { TIME_EPSILON_SECONDS } from "@/constants/animation-constants";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { EffectCategory } from "@/lib/effects/categories";
import type { EffectContext } from "@/lib/effects/types";
import { masksRegistry } from "@/lib/masks";
import { getSourceTimeAtClipTime } from "@/lib/retime";
import { detectFace } from "@/services/face-mesh";
import { webglEffectRenderer } from "../webgl/webgl-effect-renderer";
import { applyMaskFeather } from "../mask-feather";

export interface VisualNodeParams {
	duration: number;
	timeOffset: number;
	trimStart: number;
	trimEnd: number;
	retime?: RetimeConfig;
	transform: Transform;
	animations?: ElementAnimations;
	opacity: number;
	blendMode?: BlendMode;
	effects?: Effect[];
	masks?: Mask[];
}

export abstract class VisualNode<
	Params extends VisualNodeParams = VisualNodeParams,
> extends BaseNode<Params> {
	protected getSourceLocalTime({ time }: { time: number }): number {
		const clipTime = time - this.params.timeOffset;
		return (
			this.params.trimStart +
			getSourceTimeAtClipTime({
				clipTime,
				retime: this.params.retime,
			})
		);
	}

	protected getAnimationLocalTime({ time }: { time: number }): number {
		return getElementLocalTime({
			timelineTime: time,
			elementStartTime: this.params.timeOffset,
			elementDuration: this.params.duration,
		});
	}

	protected isInRange({ time }: { time: number }): boolean {
		const localTime = time - this.params.timeOffset;
		return (
			localTime >= -TIME_EPSILON_SECONDS &&
			localTime < this.params.duration
		);
	}

	protected async renderVisual({
		renderer,
		source,
		sourceWidth,
		sourceHeight,
		timelineTime,
	}: {
		renderer: CanvasRenderer;
		source: CanvasImageSource;
		sourceWidth: number;
		sourceHeight: number;
		timelineTime: number;
	}): Promise<void> {
		renderer.context.save();

		const animationLocalTime = this.getAnimationLocalTime({
			time: timelineTime,
		});
		const transform = resolveTransformAtTime({
			baseTransform: this.params.transform,
			animations: this.params.animations,
			localTime: animationLocalTime,
		});
		const opacity = resolveOpacityAtTime({
			baseOpacity: this.params.opacity,
			animations: this.params.animations,
			localTime: animationLocalTime,
		});
		const containScale = Math.min(
			renderer.width / sourceWidth,
			renderer.height / sourceHeight,
		);
		const scaledWidth = sourceWidth * containScale * transform.scaleX;
		const scaledHeight = sourceHeight * containScale * transform.scaleY;
		const absWidth = Math.abs(scaledWidth);
		const absHeight = Math.abs(scaledHeight);
		const x = renderer.width / 2 + transform.position.x - absWidth / 2;
		const y = renderer.height / 2 + transform.position.y - absHeight / 2;

		renderer.context.globalCompositeOperation = (
			this.params.blendMode && this.params.blendMode !== "normal"
				? this.params.blendMode
				: "source-over"
		) as GlobalCompositeOperation;
		renderer.context.globalAlpha = opacity;

		const flipX = scaledWidth < 0 ? -1 : 1;
		const flipY = scaledHeight < 0 ? -1 : 1;
		const needsTransform = transform.rotate !== 0 || flipX !== 1 || flipY !== 1;

		if (needsTransform) {
			const centerX = x + absWidth / 2;
			const centerY = y + absHeight / 2;
			renderer.context.translate(centerX, centerY);
			renderer.context.rotate((transform.rotate * Math.PI) / 180);
			renderer.context.scale(flipX, flipY);
			renderer.context.translate(-centerX, -centerY);
		}

		const enabledEffects =
			this.params.effects?.filter((effect) => effect.enabled) ?? [];
		const activeMasks = this.params.masks ?? [];

		if (activeMasks.length === 0 && enabledEffects.length === 0) {
			renderer.context.drawImage(source, x, y, absWidth, absHeight);
			renderer.context.restore();
			return;
		}

		const currentResult =
			enabledEffects.length > 0
				? await this.applyEffects({
						source,
						effects: enabledEffects,
						width: absWidth,
						height: absHeight,
						animationLocalTime,
					})
				: source;

		if (activeMasks.length === 0) {
			renderer.context.drawImage(currentResult, x, y, absWidth, absHeight);
			renderer.context.restore();
			return;
		}

		const elementCanvas = createOffscreenCanvas({
			width: Math.round(absWidth),
			height: Math.round(absHeight),
		});
		const elementCtx = elementCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!elementCtx) {
			renderer.context.drawImage(currentResult, x, y, absWidth, absHeight);
			renderer.context.restore();
			return;
		}

		elementCtx.drawImage(currentResult, 0, 0, absWidth, absHeight);

		for (const mask of activeMasks) {
			this.applyMask({
				mask,
				elementCtx,
				scaledWidth: absWidth,
				scaledHeight: absHeight,
			});
		}

		renderer.context.drawImage(elementCanvas, x, y, absWidth, absHeight);
		renderer.context.restore();
	}

	private async applyEffects({
		source,
		effects,
		width,
		height,
		animationLocalTime,
	}: {
		source: CanvasImageSource;
		effects: Effect[];
		width: number;
		height: number;
		animationLocalTime: number;
	}): Promise<CanvasImageSource> {
		const needsFaceContext = effects.some(
			(effect) =>
				effectsRegistry.get(effect.type).category === EffectCategory.BEAUTY,
		);
		const faceContext: EffectContext | undefined = needsFaceContext
			? await detectFace(source)
			: undefined;

		let current: CanvasImageSource = source;
		for (const effect of effects) {
			const resolvedParams = resolveEffectParamsAtTime({
				effect,
				animations: this.params.animations,
				localTime: animationLocalTime,
			});
			const definition = effectsRegistry.get(effect.type);
			const passes = resolveEffectPasses({
				definition,
				effectParams: resolvedParams,
				width,
				height,
				time: animationLocalTime,
				context: definition.category === EffectCategory.BEAUTY ? faceContext : undefined,
			});
			current = webglEffectRenderer.applyEffect({
				source: current,
				width: Math.round(width),
				height: Math.round(height),
				passes,
			});
		}
		return current;
	}

	private applyMask({
		mask,
		elementCtx,
		scaledWidth,
		scaledHeight,
	}: {
		mask: Mask;
		elementCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
		scaledWidth: number;
		scaledHeight: number;
	}): void {
		const definition = masksRegistry.get(mask.type);
		const { feather, inverted } = mask.params;

		const maskCanvas = createOffscreenCanvas({
			width: Math.round(scaledWidth),
			height: Math.round(scaledHeight),
		});
		const maskCtx = maskCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!maskCtx) return;

		maskCtx.clearRect(0, 0, scaledWidth, scaledHeight);

		let maskResult: CanvasImageSource = maskCanvas;
		let path: Path2D | null = null;

		if (feather > 0 && definition.renderer.renderMask) {
			// Bypasses JFA — avoids the two-sided distance artifact where strips
			// near the canvas edge appear semi-transparent.
			definition.renderer.renderMask({
				resolvedParams: mask.params,
				ctx: maskCtx,
				width: Math.round(scaledWidth),
				height: Math.round(scaledHeight),
				feather,
			});
		} else {
			path = definition.renderer.buildPath({
				resolvedParams: mask.params,
				width: scaledWidth,
				height: scaledHeight,
			});
			maskCtx.fillStyle = "white";
			maskCtx.fill(path);

			if (feather > 0) {
				maskResult = applyMaskFeather({
					maskCanvas,
					width: Math.round(scaledWidth),
					height: Math.round(scaledHeight),
					feather,
				});
			}
		}

		elementCtx.globalCompositeOperation = inverted
			? "destination-out"
			: "destination-in";
		elementCtx.drawImage(maskResult, 0, 0, scaledWidth, scaledHeight);
		elementCtx.globalCompositeOperation = "source-over";

		const strokePath =
			definition.renderer.buildStrokePath?.({
				resolvedParams: mask.params,
				width: scaledWidth,
				height: scaledHeight,
			}) ?? path;

		if (mask.params.strokeWidth > 0 && strokePath) {
			elementCtx.strokeStyle = mask.params.strokeColor;
			elementCtx.lineWidth = mask.params.strokeWidth;
			elementCtx.stroke(strokePath);
		}
	}
}
