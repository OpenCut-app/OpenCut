import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./contrast.frag.glsl";

export const contrastEffectDefinition: EffectDefinition = {
	type: "contrast",
	name: "Contrast",
	category: EffectCategory.COLOR_TONE,
	keywords: ["contrast", "punch", "flat"],
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
					// Map -100..100 → 0..2 (0 = no contrast, 1 = normal, 2 = max)
					u_contrast: 1 + getNumberParam(effectParams, "intensity") / 100,
				}),
			},
		],
	},
};
