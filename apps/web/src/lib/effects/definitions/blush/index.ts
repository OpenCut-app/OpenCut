import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { hexToRgb } from "@/lib/effects/utils/color";
import { getNumberParam, getStringParam } from "@/lib/effects/utils/params";
import fragmentShader from "./blush.frag.glsl";

/** Blush — soft color blend at cheek positions from face landmarks */
export const blushEffectDefinition: EffectDefinition = {
	type: "blush",
	name: "Blush",
	category: EffectCategory.BEAUTY,
	keywords: ["blush", "cheeks", "rosy", "beauty", "makeup"],
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
		{ key: "color", label: "Color", type: "color", default: "#ff9999" },
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams, context }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 100,
					u_color: hexToRgb(getStringParam(effectParams, "color", "#ff9999")),
					u_cheekLeft: context?.cheekLeft ?? [0.35, 0.55],
					u_cheekRight: context?.cheekRight ?? [0.65, 0.55],
					u_cheekRadius: context?.cheekRadius ?? 0.08,
				}),
			},
		],
	},
};
