import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";

function paramNumber(
	params: Record<string, unknown>,
	key: string,
	fallback: number,
): number {
	const value = params[key];
	return typeof value === "number" ? value : fallback;
}

export const rotateTransformDefinition: TransformDefinition = {
	type: "rotate",
	name: "Rotate",
	category: TransformCategory.SPATIAL,
	keywords: ["rotate", "rotation", "spin", "angle"],
	params: [
		{
			key: "angle",
			label: "Angle",
			type: "number",
			default: 0,
			min: -360,
			max: 360,
			step: 1,
		},
		{
			key: "anchorX",
			label: "Anchor X",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
		{
			key: "anchorY",
			label: "Anchor Y",
			type: "number",
			default: 50,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "spatial",
		apply({ ctx, transformParams, width, height }) {
			const angle = paramNumber(transformParams, "angle", 0);
			const anchorX = paramNumber(transformParams, "anchorX", 50) / 100;
			const anchorY = paramNumber(transformParams, "anchorY", 50) / 100;

			const pivotX = width * anchorX;
			const pivotY = height * anchorY;
			const radians = (angle * Math.PI) / 180;

			ctx.translate(pivotX, pivotY);
			ctx.rotate(radians);
			ctx.translate(-pivotX, -pivotY);
		},
	},
};
