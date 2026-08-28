import { describe, expect, test } from "bun:test";
import { registerDefaultTransforms } from "@/lib/transforms/definitions";
import { registerDefaultPresets } from "@/lib/transforms/presets";
import { applyPresetToElement } from "@/lib/commands/timeline/element/transforms/apply-preset-to-element";
import { resolveTransformParamsAtTime } from "@/lib/animation/transform-param-channel";
import type { ImageElement } from "@/lib/timeline";

registerDefaultTransforms();
registerDefaultPresets();

const CLIP_DURATION = 5;

function buildImageElement(): ImageElement {
	return {
		id: "element-1",
		type: "image",
		name: "Photo",
		mediaId: "media-1",
		duration: CLIP_DURATION,
		startTime: 0,
		trimStart: 0,
		trimEnd: 0,
		transform: { position: { x: 0, y: 0 }, scaleX: 1, scaleY: 1, rotate: 0 },
		opacity: 1,
	};
}

describe("Ken Burns preset animation", () => {
	test("applying the preset creates a keyframed scale transform", () => {
		const element = buildImageElement();

		const { element: updated, transformIds } = applyPresetToElement({
			element,
			presetType: "ken-burns",
		});

		expect(transformIds.length).toBe(2);
		expect(updated.clipTransforms?.length).toBe(2);

		const scaleTransform = updated.clipTransforms?.find(
			(transform) => transform.type === "scale",
		);
		expect(scaleTransform).toBeDefined();
		expect(updated.animations).toBeDefined();

		// Start of clip (localTime = 0) resolves to the preset's start
		// keyframe value (scaleX/scaleY = 100).
		const startParams = resolveTransformParamsAtTime({
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			transform: scaleTransform!,
			animations: updated.animations,
			localTime: 0,
		});
		expect(startParams.scaleX).toBe(100);
		expect(startParams.scaleY).toBe(100);

		// End of clip (localTime = duration) resolves to the preset's end
		// keyframe value (scaleX/scaleY = 130).
		const endParams = resolveTransformParamsAtTime({
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			transform: scaleTransform!,
			animations: updated.animations,
			localTime: CLIP_DURATION,
		});
		expect(endParams.scaleX).toBe(130);
		expect(endParams.scaleY).toBe(130);

		// Static (non-animated) params pass through unchanged.
		expect(startParams.anchorX).toBe(30);
		expect(endParams.anchorX).toBe(30);
	});

	test("applying the preset creates a keyframed translate transform", () => {
		const element = buildImageElement();

		const { element: updated } = applyPresetToElement({
			element,
			presetType: "ken-burns",
		});

		const translateTransform = updated.clipTransforms?.find(
			(transform) => transform.type === "translate",
		);
		expect(translateTransform).toBeDefined();

		const startParams = resolveTransformParamsAtTime({
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			transform: translateTransform!,
			animations: updated.animations,
			localTime: 0,
		});
		expect(startParams.x).toBe(0);
		expect(startParams.y).toBe(0);

		const endParams = resolveTransformParamsAtTime({
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			transform: translateTransform!,
			animations: updated.animations,
			localTime: CLIP_DURATION,
		});
		expect(endParams.x).toBe(-10);
		expect(endParams.y).toBe(-5);
	});

	test("mid-clip time interpolates linearly between keyframes", () => {
		const element = buildImageElement();

		const { element: updated } = applyPresetToElement({
			element,
			presetType: "ken-burns",
		});
		const scaleTransform = updated.clipTransforms?.find(
			(transform) => transform.type === "scale",
		);

		const midParams = resolveTransformParamsAtTime({
			// biome-ignore lint/style/noNonNullAssertion: asserted above
			transform: scaleTransform!,
			animations: updated.animations,
			localTime: CLIP_DURATION / 2,
		});
		// Linear interpolation halfway between 100 and 130.
		expect(midParams.scaleX).toBe(115);
		expect(midParams.scaleY).toBe(115);
	});
});
