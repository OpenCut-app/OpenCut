import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { hexToRgb } from "@/lib/effects/utils/color";
import { getNumberParam, getStringParam } from "@/lib/effects/utils/params";
import pass1Shader from "./neon-glow-pass1.frag.glsl";
import pass2Shader from "./neon-glow-pass2.frag.glsl";

/** Neon glow — 2-pass: extract bright areas, blur + tint */
export const neonGlowEffectDefinition: EffectDefinition = {
	type: "neon-glow",
	name: "Neon Glow",
	category: EffectCategory.ARTISTIC,
	keywords: ["neon", "glow", "bloom", "light", "bright", "luminous"],
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
		{ key: "color", label: "Glow Color", type: "color", default: "#00ff88" },
		{
			key: "threshold",
			label: "Threshold",
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
					u_threshold: getNumberParam(effectParams, "threshold") / 100,
				}),
			},
			{
				fragmentShader: pass2Shader,
				uniforms: ({ effectParams }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 50,
					u_glowColor: hexToRgb(
						getStringParam(effectParams, "color", "#00ff88"),
					),
				}),
			},
		],
	},
};
