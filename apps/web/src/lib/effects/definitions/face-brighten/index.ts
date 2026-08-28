import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./face-brighten.frag.glsl";

/** Face brighten — soft light blend, optionally masked to face region */
export const faceBrightenEffectDefinition: EffectDefinition = {
	type: "face-brighten",
	name: "Face Brighten",
	category: EffectCategory.BEAUTY,
	keywords: ["brighten", "face", "glow", "beauty", "luminous"],
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
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 200,
				}),
			},
		],
	},
};
