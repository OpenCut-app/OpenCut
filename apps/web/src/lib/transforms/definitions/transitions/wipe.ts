import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./wipe.frag.glsl";

const DIRECTIONS = [
	{ value: "left", label: "Left to Right" },
	{ value: "right", label: "Right to Left" },
	{ value: "up", label: "Bottom to Top" },
	{ value: "down", label: "Top to Bottom" },
];

export const wipeTransitionDefinition: TransformDefinition = {
	type: "wipe",
	name: "Wipe",
	category: TransformCategory.TRANSITION,
	keywords: ["wipe", "reveal", "slide", "push"],
	params: [
		{
			key: "direction",
			label: "Direction",
			type: "select",
			default: "left",
			options: DIRECTIONS,
		},
		{
			key: "softness",
			label: "Softness",
			type: "number",
			default: 5,
			min: 0,
			max: 50,
			step: 1,
		},
	],
	renderer: {
		type: "transition",
		fragmentShader,
		uniforms({ progress, transformParams }) {
			const direction = String(transformParams.direction ?? "left");
			const dirIndex = DIRECTIONS.findIndex((d) => d.value === direction);
			const softness =
				(typeof transformParams.softness === "number"
					? transformParams.softness
					: 5) / 100;
			return {
				u_progress: progress,
				u_direction: dirIndex >= 0 ? dirIndex : 0,
				u_softness: softness,
			};
		},
	},
};
