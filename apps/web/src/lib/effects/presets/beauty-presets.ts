import type { EffectPreset } from "./types";

export const beautyPresets: EffectPreset[] = [
	{
		type: "soft-glow",
		name: "Soft Glow",
		category: "beauty",
		description: "Dreamy soft-focus with gentle warmth",
		effects: [
			{ effectType: "brightness", params: { intensity: 5 } },
			{ effectType: "contrast", params: { intensity: -5 } },
			{ effectType: "saturation", params: { intensity: 10 } },
			{ effectType: "blur", params: { intensity: 3 } },
		],
	},
	{
		type: "portrait",
		name: "Portrait",
		category: "beauty",
		description: "Flattering portrait enhancement",
		effects: [
			{ effectType: "brightness", params: { intensity: 5 } },
			{ effectType: "saturation", params: { intensity: 10 } },
			{
				effectType: "vignette",
				params: { intensity: 20, radius: 85, softness: 60 },
			},
		],
	},
];
