import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./exposure.frag.glsl";

export const exposureEffectDefinition: EffectDefinition = {
	type: "exposure",
	name: "Exposure",
	category: EffectCategory.COLOR_TONE,
	keywords: ["exposure", "ev", "stops", "overexpose", "underexpose"],
	params: [
		{
			key: "stops",
			label: "Stops",
			type: "number",
			default: 0,
			min: -3,
			max: 3,
			step: 0.1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_exposure: getNumberParam(effectParams, "stops"),
				}),
			},
		],
	},
};
