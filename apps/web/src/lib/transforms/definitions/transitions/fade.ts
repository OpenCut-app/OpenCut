import type { TransformDefinition } from "@/lib/transforms/types";
import { TransformCategory } from "@/lib/transforms/categories";
import fragmentShader from "./fade.frag.glsl";

export const fadeTransitionDefinition: TransformDefinition = {
	type: "fade",
	name: "Cross Dissolve",
	category: TransformCategory.TRANSITION,
	keywords: ["fade", "dissolve", "crossfade", "blend"],
	params: [],
	renderer: {
		type: "transition",
		fragmentShader,
		uniforms({ progress }) {
			return { u_progress: progress };
		},
	},
};
