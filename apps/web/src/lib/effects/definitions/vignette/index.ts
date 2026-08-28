import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./vignette.frag.glsl";

export const vignetteEffectDefinition: EffectDefinition = {
	type: "vignette",
	name: "Vignette",
	category: EffectCategory.ARTISTIC,
	keywords: ["vignette", "border", "darken", "edges", "cinematic"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "radius",
			label: "Radius",
			type: "number",
			default: 80,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "softness",
			label: "Softness",
			type: "number",
			default: 50,
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
					u_intensity: getNumberParam(effectParams, "intensity") / 100,
					u_radius:
						(getNumberParam(effectParams, "radius") / 100) * Math.SQRT1_2,
					u_softness: (getNumberParam(effectParams, "softness") / 100) * 0.5,
				}),
			},
		],
	},
};
