import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./slim-face.frag.glsl";

/** Slim face — pinch warp along jawline for face slimming */
export const slimFaceEffectDefinition: EffectDefinition = {
	type: "slim-face",
	name: "Slim Face",
	category: EffectCategory.BEAUTY,
	keywords: ["slim", "face", "thin", "jawline", "beauty", "reshape"],
	params: [
		{
			key: "intensity",
			label: "Intensity",
			type: "number",
			default: 20,
			min: 0,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams, context }) => {
					const jawCenter =
						context?.jawPoints && context.jawPoints.length >= 2
							? context.jawPoints.slice(0, 2)
							: null;

					return {
						// No-op when jaw landmarks are missing to avoid warping arbitrary content
						u_intensity: jawCenter
							? getNumberParam(effectParams, "intensity") / 100
							: 0,
						u_jawCenter: jawCenter ?? [0.5, 0.6],
					};
				},
			},
		],
	},
};
