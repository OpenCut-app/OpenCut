import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./temperature.frag.glsl";

export const temperatureEffectDefinition: EffectDefinition = {
	type: "temperature",
	name: "Temperature",
	category: EffectCategory.COLOR_TONE,
	keywords: ["temperature", "warm", "cool", "white balance", "warmth"],
	params: [
		{
			key: "warmth",
			label: "Warmth",
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
					u_temperature: getNumberParam(effectParams, "warmth") / 400,
				}),
			},
		],
	},
};
