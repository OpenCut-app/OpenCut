import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./color-balance.frag.glsl";

/** 3-way color grading: shadows, midtones, highlights */
export const colorBalanceEffectDefinition: EffectDefinition = {
	type: "color-balance",
	name: "Color Balance",
	category: EffectCategory.COLOR_TONE,
	keywords: ["color balance", "grading", "shadows", "highlights", "midtones"],
	params: [
		{
			key: "shadowsRed",
			label: "Shadows Red",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "shadowsGreen",
			label: "Shadows Green",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "shadowsBlue",
			label: "Shadows Blue",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "midtonesRed",
			label: "Midtones Red",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "midtonesGreen",
			label: "Midtones Green",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "midtonesBlue",
			label: "Midtones Blue",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "highlightsRed",
			label: "Highlights Red",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "highlightsGreen",
			label: "Highlights Green",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "highlightsBlue",
			label: "Highlights Blue",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_shadows: [
						getNumberParam(effectParams, "shadowsRed") / 200,
						getNumberParam(effectParams, "shadowsGreen") / 200,
						getNumberParam(effectParams, "shadowsBlue") / 200,
					],
					u_midtones: [
						getNumberParam(effectParams, "midtonesRed") / 200,
						getNumberParam(effectParams, "midtonesGreen") / 200,
						getNumberParam(effectParams, "midtonesBlue") / 200,
					],
					u_highlights: [
						getNumberParam(effectParams, "highlightsRed") / 200,
						getNumberParam(effectParams, "highlightsGreen") / 200,
						getNumberParam(effectParams, "highlightsBlue") / 200,
					],
				}),
			},
		],
	},
};
