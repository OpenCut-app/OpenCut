import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./zoom.frag.glsl";

export const zoomTransitionDefinition: TransformDefinition = {
	type: "zoom",
	name: "Zoom",
	category: TransformCategory.TRANSITION,
	keywords: ["zoom", "scale", "punch"],
	params: [
		{
			key: "zoomAmount",
			label: "Zoom Amount",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "transition",
		fragmentShader,
		uniforms({ progress, transformParams }) {
			const zoomAmount =
				(typeof transformParams.zoomAmount === "number"
					? transformParams.zoomAmount
					: 20) / 100;
			return {
				u_progress: progress,
				u_zoomAmount: zoomAmount,
			};
		},
	},
};
