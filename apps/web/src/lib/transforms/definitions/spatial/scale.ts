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

export const scaleTransformDefinition: TransformDefinition = {
	type: "scale",
	name: "Scale",
	category: TransformCategory.SPATIAL,
	keywords: ["scale", "zoom", "resize", "size"],
	params: [
		{
			key: "scaleX",
			label: "Scale X",
			type: "number",
			default: 100,
			min: 0,
			max: 500,
			step: 1,
		},
		{
			key: "scaleY",
			label: "Scale Y",
			type: "number",
			default: 100,
			min: 0,
			max: 500,
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
			const scaleX = paramNumber(transformParams, "scaleX", 100) / 100;
			const scaleY = paramNumber(transformParams, "scaleY", 100) / 100;
			const anchorX = paramNumber(transformParams, "anchorX", 50) / 100;
			const anchorY = paramNumber(transformParams, "anchorY", 50) / 100;

			const pivotX = width * anchorX;
			const pivotY = height * anchorY;

			ctx.translate(pivotX, pivotY);
			ctx.scale(scaleX, scaleY);
			ctx.translate(-pivotX, -pivotY);
		},
	},
};
