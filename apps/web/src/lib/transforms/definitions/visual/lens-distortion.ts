import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./lens-distortion.frag.glsl";

function paramNumber(
	params: Record<string, unknown>,
	key: string,
	fallback: number,
): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

export const lensDistortionTransformDefinition: TransformDefinition = {
	type: "lens-distortion",
	name: "Lens Distortion",
	category: TransformCategory.VISUAL,
	keywords: ["lens", "distortion", "barrel", "pincushion", "fisheye"],
	params: [
		{
			key: "strength",
			label: "Strength",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "zoom",
			label: "Zoom",
			type: "number",
			default: 100,
			min: 50,
			max: 150,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		fragmentShader,
		uniforms({ transformParams }) {
			const strength = paramNumber(transformParams, "strength", 0) / 100;
			const zoom = paramNumber(transformParams, "zoom", 100) / 100;
			return {
				u_strength: strength,
				u_zoom: zoom,
			};
		},
	},
};
