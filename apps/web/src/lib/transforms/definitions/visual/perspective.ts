import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./perspective.frag.glsl";

function paramNumber(
	params: Record<string, unknown>,
	key: string,
	fallback: number,
): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

export const perspectiveTransformDefinition: TransformDefinition = {
	type: "perspective",
	name: "Perspective",
	category: TransformCategory.VISUAL,
	keywords: ["perspective", "3d", "tilt", "warp"],
	params: [
		{
			key: "rotateX",
			label: "Tilt X",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "rotateY",
			label: "Tilt Y",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "perspective",
			label: "Depth",
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
		uniforms({ transformParams }) {
			return {
				u_rotateX: paramNumber(transformParams, "rotateX", 0) / 100,
				u_rotateY: paramNumber(transformParams, "rotateY", 0) / 100,
				u_perspective: paramNumber(transformParams, "perspective", 50) / 100,
			};
		},
	},
};
