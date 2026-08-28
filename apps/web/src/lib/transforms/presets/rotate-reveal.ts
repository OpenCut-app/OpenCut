import type { TransformPreset } from "./types";

/**
 * Ported 1:1 from source package keyframe data. Source easings
 * "ease-out-cubic" / "ease-in-cubic" have no bezier equivalent in dev's
 * animation system (linear/hold only) — mapped to "linear" when the
 * preset is applied (see `apply-preset.ts`).
 */
export const rotateRevealPreset: TransformPreset = {
	type: "rotate-reveal",
	name: "Rotate Reveal",
	description: "Rotation with scale for dramatic reveal",
	category: "reveal",
	suggestedDuration: 2,
	transforms: [
		{
			transformType: "rotate",
			params: {
				angle: -15,
				anchorX: 50,
				anchorY: 50,
			},
			animatedParams: {
				angle: [
					{ normalizedTime: 0, value: -15, easing: "ease-out-cubic" },
					{ normalizedTime: 1, value: 0 },
				],
			},
		},
		{
			transformType: "scale",
			params: {
				scaleX: 80,
				scaleY: 80,
				anchorX: 50,
				anchorY: 50,
			},
			animatedParams: {
				scaleX: [
					{ normalizedTime: 0, value: 80, easing: "ease-out-cubic" },
					{ normalizedTime: 1, value: 100 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 80, easing: "ease-out-cubic" },
					{ normalizedTime: 1, value: 100 },
				],
			},
		},
	],
};

/** Spin exit */
export const spinExitPreset: TransformPreset = {
	type: "spin-exit",
	name: "Spin Exit",
	description: "Rotate and scale down to exit",
	category: "reveal",
	suggestedDuration: 1,
	transforms: [
		{
			transformType: "rotate",
			params: {
				angle: 0,
				anchorX: 50,
				anchorY: 50,
			},
			animatedParams: {
				angle: [
					{ normalizedTime: 0, value: 0, easing: "ease-in-cubic" },
					{ normalizedTime: 1, value: 180 },
				],
			},
		},
		{
			transformType: "scale",
			params: {
				scaleX: 100,
				scaleY: 100,
				anchorX: 50,
				anchorY: 50,
			},
			animatedParams: {
				scaleX: [
					{ normalizedTime: 0, value: 100, easing: "ease-in-cubic" },
					{ normalizedTime: 1, value: 0 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 100, easing: "ease-in-cubic" },
					{ normalizedTime: 1, value: 0 },
				],
			},
		},
	],
};
