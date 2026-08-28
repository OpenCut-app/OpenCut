import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import pass1Shader from "./glitch-pass1.frag.glsl";
import pass2Shader from "./glitch-pass2.frag.glsl";

/** Digital glitch — 2-pass: block displacement + scanlines */
export const glitchEffectDefinition: EffectDefinition = {
	type: "glitch",
	name: "Glitch",
	category: EffectCategory.ARTISTIC,
	keywords: ["glitch", "digital", "distortion", "corrupt", "vhs", "static"],
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
			key: "speed",
			label: "Speed",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "colorSplit",
			label: "Color Split",
			type: "number",
			default: 30,
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
				uniforms: ({ effectParams, width, time }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 1000,
					u_colorSplit:
						getNumberParam(effectParams, "colorSplit") / (width * 10),
					u_time:
						(time ?? 0) * (getNumberParam(effectParams, "speed", 50) / 50),
				}),
			},
			{
				fragmentShader: pass2Shader,
				uniforms: ({ effectParams, time }) => ({
					u_intensity: getNumberParam(effectParams, "intensity") / 100,
					u_time:
						(time ?? 0) * (getNumberParam(effectParams, "speed", 50) / 50),
				}),
			},
		],
	},
};
