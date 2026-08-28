import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./gamma.frag.glsl";

export const gammaEffectDefinition: EffectDefinition = {
	type: "gamma",
	name: "Gamma",
	category: EffectCategory.COLOR_TONE,
	keywords: ["gamma", "curve", "midtones"],
	params: [
		{
			key: "value",
			label: "Gamma",
			type: "number",
			default: 1.0,
			min: 0.1,
			max: 3.0,
			step: 0.05,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_gamma: getNumberParam(effectParams, "value", 1.0),
				}),
			},
		],
	},
};
