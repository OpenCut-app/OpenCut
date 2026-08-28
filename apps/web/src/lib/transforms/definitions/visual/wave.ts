import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./wave.frag.glsl";

function paramNumber(
	params: Record<string, unknown>,
	key: string,
	fallback: number,
): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

export const waveTransformDefinition: TransformDefinition = {
	type: "wave",
	name: "Wave",
	category: TransformCategory.VISUAL,
	keywords: ["wave", "ripple", "distort", "wobble"],
	params: [
		{
			key: "amplitude",
			label: "Amplitude",
			type: "number",
			default: 10,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "frequency",
			label: "Frequency",
			type: "number",
			default: 10,
			min: 1,
			max: 50,
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
	],
	renderer: {
		type: "webgl",
		fragmentShader,
		uniforms({ transformParams, time }) {
			return {
				u_amplitude: paramNumber(transformParams, "amplitude", 10) / 100,
				u_frequency: paramNumber(transformParams, "frequency", 10),
				u_speed: paramNumber(transformParams, "speed", 50) / 10,
				u_time: time ?? 0,
			};
		},
	},
};
