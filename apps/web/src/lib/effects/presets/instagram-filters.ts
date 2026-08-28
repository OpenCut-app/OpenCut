import type { EffectPreset } from "./types";

export const instagramPresets: EffectPreset[] = [
	{
		type: "clarendon",
		name: "Clarendon",
		category: "instagram",
		description: "Bright, vivid colors with strong contrast",
		effects: [
			{ effectType: "brightness", params: { intensity: 10 } },
			{ effectType: "contrast", params: { intensity: 20 } },
			{ effectType: "saturation", params: { intensity: 15 } },
			{
				effectType: "vignette",
				params: { intensity: 30, radius: 80, softness: 50 },
			},
		],
	},
	{
		type: "juno",
		name: "Juno",
		category: "instagram",
		description: "Warm tones with boosted saturation",
		effects: [
			{ effectType: "brightness", params: { intensity: 5 } },
			{ effectType: "saturation", params: { intensity: 25 } },
			{ effectType: "temperature", params: { warmth: 15 } },
			{
				effectType: "vignette",
				params: { intensity: 20, radius: 80, softness: 50 },
			},
		],
	},
	{
		type: "lark",
		name: "Lark",
		category: "instagram",
		description: "Bright, airy with desaturated colors",
		effects: [
			{ effectType: "brightness", params: { intensity: 15 } },
			{ effectType: "contrast", params: { intensity: -10 } },
			{ effectType: "saturation", params: { intensity: -15 } },
			{ effectType: "temperature", params: { warmth: -10 } },
		],
	},
	{
		type: "gingham",
		name: "Gingham",
		category: "instagram",
		description: "Soft, vintage feel with muted colors",
		effects: [
			{ effectType: "brightness", params: { intensity: 5 } },
			{ effectType: "contrast", params: { intensity: -10 } },
			{ effectType: "saturation", params: { intensity: -30 } },
			{ effectType: "hue-shift", params: { degrees: 5 } },
		],
	},
	{
		type: "valencia",
		name: "Valencia",
		category: "instagram",
		description: "Warm, faded with golden tones",
		effects: [
			{ effectType: "temperature", params: { warmth: 20 } },
			{ effectType: "contrast", params: { intensity: 10 } },
			{ effectType: "saturation", params: { intensity: -10 } },
			{
				effectType: "vignette",
				params: { intensity: 40, radius: 70, softness: 60 },
			},
		],
	},
	{
		type: "nashville",
		name: "Nashville",
		category: "instagram",
		description: "Warm, dreamy with purple undertones",
		effects: [
			{ effectType: "brightness", params: { intensity: 10 } },
			{ effectType: "temperature", params: { warmth: 30 } },
			{ effectType: "contrast", params: { intensity: 20 } },
			{ effectType: "saturation", params: { intensity: -20 } },
		],
	},
];
