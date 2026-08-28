import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./teeth-whiten.frag.glsl";

/** Teeth whiten — desaturate + brighten, ideally masked to mouth region */
export const teethWhitenEffectDefinition: EffectDefinition = {
	type: "teeth-whiten",
	name: "Teeth Whiten",
	category: EffectCategory.BEAUTY,
	keywords: ["teeth", "whiten", "smile", "beauty", "dental"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 40,
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
