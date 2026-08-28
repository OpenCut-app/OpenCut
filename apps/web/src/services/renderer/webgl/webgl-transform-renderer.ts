import { getWebGLContext, readResult } from "./webgl-context";
import { applyMultiPassEffect } from "./webgl-utils";
import { transformsRegistry } from "@/lib/transforms";
import type { ClipTransform } from "@/lib/transforms/types";
import type { VisualTransformRenderer } from "@/lib/transforms/types";

/**
 * Apply enabled webgl (visual) clip transforms to a source image, in order.
 * Spatial transforms are handled separately via Canvas2D matrix ops
 * (see `applySpatialTransforms` in `visual-node.ts`).
 */
function applyVisualTransforms({
	source,
	transforms,
	width,
	height,
	time,
}: {
	source: CanvasImageSource;
	transforms: ClipTransform[];
	width: number;
	height: number;
	time: number;
}): CanvasImageSource {
	const webglTransforms = transforms.filter((transform) => {
		if (!transform.enabled) return false;
		return transformsRegistry.get(transform.type).renderer.type === "webgl";
	});

	if (webglTransforms.length === 0) {
		return source;
	}

	let current: CanvasImageSource = source;
	for (const transform of webglTransforms) {
		const definition = transformsRegistry.get(transform.type);
		if (definition.renderer.type !== "webgl") continue;

		const renderer = definition.renderer as VisualTransformRenderer;
		const { context, programCache } = getWebGLContext({ width, height });
		applyMultiPassEffect({
			context,
			source: current,
			width,
			height,
			passes: [
				{
					fragmentShader: renderer.fragmentShader,
					uniforms: renderer.uniforms({
						transformParams: transform.params,
						width,
						height,
						time,
					}),
				},
			],
			programCache,
		});
		current = readResult({ width, height });
	}

	return current;
}

function hasVisualTransforms(transforms: ClipTransform[]): boolean {
	return transforms.some((transform) => {
		if (!transform.enabled) return false;
		return transformsRegistry.get(transform.type).renderer.type === "webgl";
	});
}

function hasSpatialTransforms(transforms: ClipTransform[]): boolean {
	return transforms.some((transform) => {
		if (!transform.enabled) return false;
		return transformsRegistry.get(transform.type).renderer.type === "spatial";
	});
}

export const webglTransformRenderer = {
	applyVisualTransforms,
	hasVisualTransforms,
	hasSpatialTransforms,
};
