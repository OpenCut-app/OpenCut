import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import pass1Shader from "./oil-paint-pass1.frag.glsl";
import pass2Shader from "./oil-paint-pass2.frag.glsl";

/** Oil paint — 2-pass: color quantization + neighborhood averaging (Kuwahara-inspired) */
export const oilPaintEffectDefinition: EffectDefinition = {
	type: "oil-paint",
	name: "Oil Paint",
	category: EffectCategory.ARTISTIC,
	keywords: ["oil paint", "painting", "artistic", "impressionist", "canvas"],
	params: [
		{
			key: "radius",
			label: "Radius",
			type: "number",
			default: 4,
			min: 1,
			max: 5,
			step: 1,
		},
		{
			key: "levels",
			label: "Color Levels",
			type: "number",
			default: 8,
			min: 2,
			max: 20,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader: pass1Shader,
				uniforms: ({ effectParams }) => ({
					u_levels: getNumberParam(effectParams, "levels", 8),
				}),
			},
			{
				fragmentShader: pass2Shader,
				uniforms: ({ effectParams }) => ({
					u_radius: getNumberParam(effectParams, "radius", 4),
				}),
			},
		],
	},
};
