import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./hue-shift.frag.glsl";

export const hueShiftEffectDefinition: EffectDefinition = {
	type: "hue-shift",
	name: "Hue Shift",
	category: EffectCategory.COLOR_TONE,
	keywords: ["hue", "shift", "rotate", "color wheel", "tint"],
	params: [
		{
			key: "degrees",
			label: "Degrees",
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
					// Convert degrees to 0..1 range for HSL rotation
					u_hueShift: getNumberParam(effectParams, "degrees") / 360,
				}),
			},
		],
	},
};
