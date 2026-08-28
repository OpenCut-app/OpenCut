import { transformsRegistry } from "@/lib/transforms";
import type {
	ClipTransform,
	SpatialTransformRenderer,
} from "@/lib/transforms/types";

/**
 * Apply enabled spatial clip transforms to a Canvas2D context, in order.
 * Caller is responsible for `ctx.save()`/`ctx.restore()` around this call
 * so the matrix/clip state doesn't leak into subsequent draws.
 */
export function applySpatialTransforms({
	ctx,
	transforms,
	width,
	height,
}: {
	ctx: CanvasRenderingContext2D;
	transforms: ClipTransform[];
	width: number;
	height: number;
}): void {
	for (const transform of transforms) {
		if (!transform.enabled) continue;
		const definition = transformsRegistry.get(transform.type);
		if (definition.renderer.type !== "spatial") continue;

		const renderer = definition.renderer as SpatialTransformRenderer;
		renderer.apply({
			ctx,
			transformParams: transform.params,
			width,
			height,
		});
	}
}
