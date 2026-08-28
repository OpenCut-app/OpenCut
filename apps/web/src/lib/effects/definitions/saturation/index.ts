import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./saturation.frag.glsl";

export const saturationEffectDefinition: EffectDefinition = {
	type: "saturation",
	name: "Saturation",
	category: EffectCategory.COLOR_TONE,
	keywords: ["saturation", "vibrance", "color", "desaturate", "grayscale"],
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
					// Map -100..100 → 0..2 (0 = grayscale, 1 = normal, 2 = oversaturated)
					u_saturation: 1 + getNumberParam(effectParams, "intensity") / 100,
				}),
			},
		],
	},
};
