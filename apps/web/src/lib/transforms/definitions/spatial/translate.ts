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

export const translateTransformDefinition: TransformDefinition = {
	type: "translate",
	name: "Translate",
	category: TransformCategory.SPATIAL,
	keywords: ["translate", "pan", "move", "position", "offset"],
	params: [
		{
			key: "x",
			label: "X Offset",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
		{
			key: "y",
			label: "Y Offset",
			type: "number",
			default: 0,
			min: -100,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "spatial",
		apply({ ctx, transformParams, width, height }) {
			// Values are percentage of canvas size
			const x = paramNumber(transformParams, "x", 0);
			const y = paramNumber(transformParams, "y", 0);

			const offsetX = (x / 100) * width;
			const offsetY = (y / 100) * height;

			ctx.translate(offsetX, offsetY);
		},
	},
};
