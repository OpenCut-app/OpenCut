import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./chromatic-aberration.frag.glsl";

export const chromaticAberrationEffectDefinition: EffectDefinition = {
	type: "chromatic-aberration",
	name: "Chromatic Aberration",
	category: EffectCategory.ARTISTIC,
	keywords: [
		"chromatic",
		"aberration",
		"rgb split",
		"lens",
		"distortion",
		"prism",
	],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "angle",
			label: "Angle",
			type: "number",
			default: 0,
			min: 0,
			max: 360,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 10,
					u_angle: (getNumberParam(effectParams, "angle") * Math.PI) / 180,
				}),
			},
		],
	},
};
