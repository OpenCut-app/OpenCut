import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import pass1Shader from "./sketch-pass1.frag.glsl";
import pass2Shader from "./sketch-pass2.frag.glsl";

/** Sketch/outline — 2-pass: Sobel edge detection + threshold */
export const sketchEffectDefinition: EffectDefinition = {
	type: "sketch",
	name: "Sketch",
	category: EffectCategory.ARTISTIC,
	keywords: ["sketch", "outline", "pencil", "edge", "drawing", "line art"],
	params: [
		{
			key: "threshold",
			label: "Threshold",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "lineWidth",
			label: "Line Width",
			type: "number",
			default: 1,
			min: 1,
			max: 5,
			step: 0.5,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader: pass1Shader,
				uniforms: ({ effectParams }) => ({
					u_lineWidth: getNumberParam(effectParams, "lineWidth", 1),
				}),
			},
			{
				fragmentShader: pass2Shader,
				uniforms: ({ effectParams }) => ({
					u_threshold: getNumberParam(effectParams, "threshold") / 100,
				}),
			},
		],
	},
};
