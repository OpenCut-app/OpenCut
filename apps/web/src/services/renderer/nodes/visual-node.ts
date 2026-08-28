import type { CanvasRenderer } from "../canvas-renderer";
import { createOffscreenCanvas } from "../canvas-utils";
import { BaseNode } from "./base-node";
import type { Effect } from "@/lib/effects/types";
import type { Mask } from "@/lib/masks/types";
import type { ClipTransform } from "@/lib/transforms/types";
import type { BlendMode, Transform } from "@/lib/rendering";
import type { ElementAnimations } from "@/lib/animation/types";
import type { RetimeConfig } from "@/lib/timeline";
import {
	getElementLocalTime,
	resolveOpacityAtTime,
	resolveTransformAtTime,
} from "@/lib/animation";
import { resolveEffectParamsAtTime } from "@/lib/animation/effect-param-channel";
import { resolveTransformParamsAtTime } from "@/lib/animation/transform-param-channel";
import { TIME_EPSILON_SECONDS } from "@/constants/animation-constants";
import { effectsRegistry, resolveEffectPasses } from "@/lib/effects";
import { EffectCategory } from "@/lib/effects/categories";
import type { EffectContext } from "@/lib/effects/types";
import { masksRegistry } from "@/lib/masks";
import { getSourceTimeAtClipTime } from "@/lib/retime";
import { detectFace } from "@/services/face-mesh";
import { webglEffectRenderer } from "../webgl/webgl-effect-renderer";
import { webglTransformRenderer } from "../webgl/webgl-transform-renderer";
import { applySpatialTransforms } from "../apply-spatial-transforms";
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
	clipTransforms?: ClipTransform[];
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
			localTime >= -TIME_EPSILON_SECONDS && localTime < this.params.duration
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
		const enabledTransforms =
			this.params.clipTransforms?.filter(
				(clipTransform) => clipTransform.enabled,
			) ?? [];

		if (
			activeMasks.length === 0 &&
			enabledEffects.length === 0 &&
			enabledTransforms.length === 0
		) {
			renderer.context.drawImage(source, x, y, absWidth, absHeight);
			renderer.context.restore();
			return;
		}

		const afterEffects =
			enabledEffects.length > 0
				? await this.applyEffects({
						source,
						effects: enabledEffects,
						width: absWidth,
						height: absHeight,
						animationLocalTime,
					})
				: source;

		// Render pipeline order: effects -> masks -> transforms.
		// Transforms reshape/reposition the final composited element, so they
		// run last. This ordering is a provisional default pending maintainer
		// confirmation — revisit if product requirements dictate otherwise.
		const afterMasks =
			activeMasks.length > 0
				? this.applyMasks({
						source: afterEffects,
						masks: activeMasks,
						scaledWidth: absWidth,
						scaledHeight: absHeight,
					})
				: afterEffects;

		if (enabledTransforms.length === 0) {
			renderer.context.drawImage(afterMasks, x, y, absWidth, absHeight);
			renderer.context.restore();
			return;
		}

		const finalResult = this.applyClipTransforms({
			source: afterMasks,
			transforms: enabledTransforms,
			width: absWidth,
			height: absHeight,
			animationLocalTime,
		});

		renderer.context.drawImage(finalResult, x, y, absWidth, absHeight);
		renderer.context.restore();
	}

	private applyMasks({
		source,
		masks,
		scaledWidth,
		scaledHeight,
	}: {
		source: CanvasImageSource;
		masks: Mask[];
		scaledWidth: number;
		scaledHeight: number;
	}): CanvasImageSource {
		const elementCanvas = createOffscreenCanvas({
			width: Math.round(scaledWidth),
			height: Math.round(scaledHeight),
		});
		const elementCtx = elementCanvas.getContext("2d") as
			| CanvasRenderingContext2D
			| OffscreenCanvasRenderingContext2D
			| null;
		if (!elementCtx) {
			return source;
		}

		elementCtx.drawImage(source, 0, 0, scaledWidth, scaledHeight);

		for (const mask of masks) {
			this.applyMask({
				mask,
				elementCtx,
				scaledWidth,
				scaledHeight,
			});
		}

		return elementCanvas;
	}

	private applyClipTransforms({
		source,
		transforms,
		width,
		height,
		animationLocalTime,
	}: {
		source: CanvasImageSource;
		transforms: ClipTransform[];
		width: number;
		height: number;
		animationLocalTime: number;
	}): CanvasImageSource {
		let current: CanvasImageSource = source;

		// Resolve each transform's params at the current animation time before
		// handing off to the renderers, mirroring how applyEffects resolves
		// effect params via resolveEffectParamsAtTime. Renderers only ever see
		// the resolved (static-at-this-instant) param values, never raw
		// keyframe arrays.
		const resolvedTransforms: ClipTransform[] = transforms.map((transform) => ({
			...transform,
			params: resolveTransformParamsAtTime({
				transform,
				animations: this.params.animations,
				localTime: animationLocalTime,
			}),
		}));

		if (webglTransformRenderer.hasVisualTransforms(resolvedTransforms)) {
			current = webglTransformRenderer.applyVisualTransforms({
				source: current,
				transforms: resolvedTransforms,
				width: Math.round(width),
				height: Math.round(height),
				time: animationLocalTime,
			});
		}

		if (webglTransformRenderer.hasSpatialTransforms(resolvedTransforms)) {
			const spatialCanvas = createOffscreenCanvas({
				width: Math.round(width),
				height: Math.round(height),
			});
			const spatialCtx = spatialCanvas.getContext("2d") as
				| CanvasRenderingContext2D
				| OffscreenCanvasRenderingContext2D
				| null;
			if (spatialCtx) {
				const ctx = spatialCtx as CanvasRenderingContext2D;
				ctx.save();
				applySpatialTransforms({
					ctx,
					transforms: resolvedTransforms,
					width,
					height,
				});
				ctx.drawImage(current, 0, 0, width, height);
				ctx.restore();
				current = spatialCanvas;
			}
		}

		return current;
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
				context:
					definition.category === EffectCategory.BEAUTY
						? faceContext
						: undefined,
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
