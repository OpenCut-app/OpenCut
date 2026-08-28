import type { TransformPreset } from "./types";

/**
 * Ken Burns: Pan + zoom effect for photos. Ported 1:1 from the source
 * package's keyframe data (scratchpad `packages/transforms/src/presets/
 * ken-burns.ts`) — `animatedParams` normalized times (0..1) are converted
 * to absolute seconds against the target clip's duration when the preset
 * is applied (see `apply-preset.ts`). Static (non-animated) params like
 * anchorX/anchorY stay in `params`.
 */
export const kenBurnsPreset: TransformPreset = {
	type: "ken-burns",
	name: "Ken Burns",
	description: "Classic documentary-style pan and zoom for photos",
	category: "motion",
	suggestedDuration: 5,
	transforms: [
		{
			transformType: "scale",
			params: {
				scaleX: 100,
				scaleY: 100,
				anchorX: 30,
				anchorY: 30,
			},
			animatedParams: {
				scaleX: [
					{ normalizedTime: 0, value: 100, easing: "ease-out" },
					{ normalizedTime: 1, value: 130 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 100, easing: "ease-out" },
					{ normalizedTime: 1, value: 130 },
				],
			},
		},
		{
			transformType: "translate",
			params: {
				x: 0,
				y: 0,
			},
			animatedParams: {
				x: [
					{ normalizedTime: 0, value: 0, easing: "ease-in-out" },
					{ normalizedTime: 1, value: -10 },
				],
				y: [
					{ normalizedTime: 0, value: 0, easing: "ease-in-out" },
					{ normalizedTime: 1, value: -5 },
				],
			},
		},
	],
};

/** Ken Burns reverse: zoom out */
export const kenBurnsReversePreset: TransformPreset = {
	type: "ken-burns-reverse",
	name: "Ken Burns (Reverse)",
	description: "Zoom out reveal effect for photos",
	category: "motion",
	suggestedDuration: 5,
	transforms: [
		{
			transformType: "scale",
			params: {
				scaleX: 130,
				scaleY: 130,
				anchorX: 70,
				anchorY: 70,
			},
			animatedParams: {
				scaleX: [
					{ normalizedTime: 0, value: 130, easing: "ease-out" },
					{ normalizedTime: 1, value: 100 },
				],
				scaleY: [
					{ normalizedTime: 0, value: 130, easing: "ease-out" },
					{ normalizedTime: 1, value: 100 },
				],
			},
		},
	],
};
