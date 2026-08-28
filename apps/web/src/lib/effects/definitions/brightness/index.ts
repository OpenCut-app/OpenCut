import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./brightness.frag.glsl";

export const brightnessEffectDefinition: EffectDefinition = {
	type: "brightness",
	name: "Brightness",
	category: EffectCategory.COLOR_TONE,
	keywords: ["brightness", "light", "dark", "brighten", "darken"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
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
					u_intensity: getNumberParam(effectParams, "intensity") / 100,
				}),
			},
		],
	},
};
