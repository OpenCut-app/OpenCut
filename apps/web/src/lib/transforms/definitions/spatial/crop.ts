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

export const cropTransformDefinition: TransformDefinition = {
	type: "crop",
	name: "Crop",
	category: TransformCategory.SPATIAL,
	keywords: ["crop", "trim", "letterbox", "cut"],
	params: [
		{
			key: "left",
			label: "Left",
			type: "number",
			default: 0,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "right",
			label: "Right",
			type: "number",
			default: 0,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "top",
			label: "Top",
			type: "number",
			default: 0,
			min: 0,
			max: 50,
			step: 1,
		},
		{
			key: "bottom",
			label: "Bottom",
			type: "number",
			default: 0,
			min: 0,
			max: 50,
			step: 1,
		},
	],
	renderer: {
		type: "spatial",
		apply({ ctx, transformParams, width, height }) {
			const left = paramNumber(transformParams, "left", 0) / 100;
			const right = paramNumber(transformParams, "right", 0) / 100;
			const top = paramNumber(transformParams, "top", 0) / 100;
			const bottom = paramNumber(transformParams, "bottom", 0) / 100;

			const cropX = width * left;
			const cropY = height * top;
			const cropWidth = width * (1 - left - right);
			const cropHeight = height * (1 - top - bottom);

			// Create clipping region
			ctx.beginPath();
			ctx.rect(cropX, cropY, cropWidth, cropHeight);
			ctx.clip();
		},
	},
};
