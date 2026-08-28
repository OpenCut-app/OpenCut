import type { TransformPreset } from "./types";

/**
 * Ported 1:1 from source package keyframe data. Source easing
 * "ease-in-out-cubic" has no bezier equivalent in dev's animation system
 * (linear/hold only) — mapped to "linear" when the preset is applied (see
 * `apply-preset.ts`).
 */
export const cinematicZoomInPreset: TransformPreset = {
	type: "cinematic-zoom-in",
	name: "Cinematic Zoom In",
	description: "Slow dramatic zoom toward center",
	category: "cinematic",
	suggestedDuration: 3,
	transforms: [
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
					{ normalizedTime: 0, value: 100, easing: "ease-in-out-cubic" },
					{ normalizedTime: 1, value: 120 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 100, easing: "ease-in-out-cubic" },
					{ normalizedTime: 1, value: 120 },
				],
			},
		},
	],
};

/** Smooth zoom out */
export const cinematicZoomOutPreset: TransformPreset = {
	type: "cinematic-zoom-out",
	name: "Cinematic Zoom Out",
	description: "Slow dramatic zoom away from center",
	category: "cinematic",
	suggestedDuration: 3,
	transforms: [
		{
			transformType: "scale",
			params: {
				scaleX: 120,
				scaleY: 120,
				anchorX: 50,
				anchorY: 50,
			},
			animatedParams: {
				scaleX: [
					{ normalizedTime: 0, value: 120, easing: "ease-in-out-cubic" },
					{ normalizedTime: 1, value: 100 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 120, easing: "ease-in-out-cubic" },
					{ normalizedTime: 1, value: 100 },
				],
			},
		},
	],
};
