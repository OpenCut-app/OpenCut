import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import pass1Shader from "./skin-smooth-pass1.frag.glsl";
import pass2Shader from "./skin-smooth-pass2.frag.glsl";

/** Skin smooth — bilateral filter that preserves edges, optionally masked to face region */
export const skinSmoothEffectDefinition: EffectDefinition = {
	type: "skin-smooth",
	name: "Skin Smooth",
	category: EffectCategory.BEAUTY,
	keywords: ["skin", "smooth", "beauty", "soft", "face", "portrait"],
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
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader: pass1Shader,
				uniforms: ({ effectParams }) => ({
					u_intensity: (getNumberParam(effectParams, "intensity") / 100) * 3,
				}),
			},
			{
				fragmentShader: pass2Shader,
				uniforms: ({ context }) => ({
					u_faceMaskEnabled: context?.faceDetected ? 1 : 0,
				}),
			},
		],
	},
};
