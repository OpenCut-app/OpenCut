import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam, getBooleanParam } from "@/lib/effects/utils/params";
import fragmentShader from "./film-grain.frag.glsl";

export const filmGrainEffectDefinition: EffectDefinition = {
	type: "film-grain",
	name: "Film Grain",
	category: EffectCategory.ARTISTIC,
	keywords: ["grain", "film", "noise", "analog", "texture", "vintage"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 30,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "size",
			label: "Grain Size",
			type: "number",
			default: 2,
			min: 1,
			max: 10,
			step: 1,
		},
		{ key: "animated", label: "Animated", type: "boolean", default: true },
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams, time }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 400,
					u_grainSize: getNumberParam(effectParams, "size", 2),
					u_time: getBooleanParam(effectParams, "animated", true)
						? (time ?? 0)
						: 0,
				}),
			},
		],
	},
};
