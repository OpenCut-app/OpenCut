import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./slide.frag.glsl";

const DIRECTIONS = [
	{ value: "left", label: "Slide Left" },
	{ value: "right", label: "Slide Right" },
	{ value: "up", label: "Slide Up" },
	{ value: "down", label: "Slide Down" },
];

export const slideTransitionDefinition: TransformDefinition = {
	type: "slide",
	name: "Slide",
	category: TransformCategory.TRANSITION,
	keywords: ["slide", "push", "move"],
	params: [
		{
			key: "direction",
			label: "Direction",
			type: "select",
			default: "left",
			options: DIRECTIONS,
		},
	],
	renderer: {
		type: "transition",
		fragmentShader,
		uniforms({ progress, transformParams }) {
			const direction = String(transformParams.direction ?? "left");
			const dirIndex = DIRECTIONS.findIndex((d) => d.value === direction);
			return {
				u_progress: progress,
				u_direction: dirIndex >= 0 ? dirIndex : 0,
			};
		},
	},
};
