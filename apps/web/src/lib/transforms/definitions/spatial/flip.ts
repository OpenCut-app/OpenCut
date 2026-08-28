import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";

export const flipTransformDefinition: TransformDefinition = {
	type: "flip",
	name: "Flip",
	category: TransformCategory.SPATIAL,
	keywords: ["flip", "mirror", "horizontal", "vertical"],
	params: [
		{
			key: "horizontal",
			label: "Horizontal",
			type: "boolean",
			default: false,
		},
		{
			key: "vertical",
			label: "Vertical",
			type: "boolean",
			default: false,
		},
	],
	renderer: {
		type: "spatial",
		apply({ ctx, transformParams, width, height }) {
			const horizontal = transformParams.horizontal === true;
			const vertical = transformParams.vertical === true;

			const scaleX = horizontal ? -1 : 1;
			const scaleY = vertical ? -1 : 1;

			ctx.translate(horizontal ? width : 0, vertical ? height : 0);
			ctx.scale(scaleX, scaleY);
		},
	},
};
