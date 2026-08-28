import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./eye-enhance.frag.glsl";

/** Eye enhance — brighten and sharpen eye regions */
export const eyeEnhanceEffectDefinition: EffectDefinition = {
	type: "eye-enhance",
	name: "Eye Enhance",
	category: EffectCategory.BEAUTY,
	keywords: ["eye", "enhance", "bright", "sparkle", "beauty"],
	params: [
		{
			key: "brightness",
			label: "Brightness",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "contrast",
			label: "Contrast",
			type: "number",
			default: 15,
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
					u_brightness: getNumberParam(effectParams, "brightness") / 400,
					u_contrast: 1 + getNumberParam(effectParams, "contrast") / 200,
				}),
			},
		],
	},
};
