import type { EffectPreset } from "./types";

export const cinematicPresets: EffectPreset[] = [
	{
		type: "teal-and-orange",
		name: "Teal & Orange",
		category: "cinematic",
		description: "Classic Hollywood color grading",
		effects: [
			{
				effectType: "color-balance",
				params: {
					shadowsRed: -30,
					shadowsGreen: 10,
					shadowsBlue: 30,
					midtonesRed: 0,
					midtonesGreen: 0,
					midtonesBlue: 0,
					highlightsRed: 30,
					highlightsGreen: 10,
					highlightsBlue: -20,
				},
			},
			{ effectType: "contrast", params: { intensity: 15 } },
		],
	},
	{
		type: "vintage-film",
		name: "Vintage Film",
		category: "cinematic",
		description: "Aged film stock with grain and warmth",
		effects: [
			{ effectType: "temperature", params: { warmth: 10 } },
			{ effectType: "saturation", params: { intensity: -20 } },
			{
				effectType: "film-grain",
				params: { intensity: 20, size: 2, animated: true },
			},
			{
				effectType: "vignette",
				params: { intensity: 30, radius: 75, softness: 50 },
			},
		],
	},
	{
		type: "noir",
		name: "Noir",
		category: "cinematic",
		description: "High contrast black and white",
		effects: [
			{ effectType: "saturation", params: { intensity: -100 } },
			{ effectType: "contrast", params: { intensity: 30 } },
			{
				effectType: "vignette",
				params: { intensity: 50, radius: 70, softness: 40 },
			},
		],
	},
	{
		type: "bleach-bypass",
		name: "Bleach Bypass",
		category: "cinematic",
		description: "Desaturated, high-contrast silver look",
		effects: [
			{ effectType: "saturation", params: { intensity: -40 } },
			{ effectType: "contrast", params: { intensity: 25 } },
			{ effectType: "brightness", params: { intensity: -5 } },
		],
	},
];
