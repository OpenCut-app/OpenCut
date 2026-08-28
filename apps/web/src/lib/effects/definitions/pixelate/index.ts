import type { EffectDefinition } from "@/lib/effects/types";
import { EffectCategory } from "@/lib/effects/categories";
import { getNumberParam } from "@/lib/effects/utils/params";
import fragmentShader from "./pixelate.frag.glsl";

export const pixelateEffectDefinition: EffectDefinition = {
	type: "pixelate",
	name: "Pixelate",
	category: EffectCategory.ARTISTIC,
	keywords: ["pixelate", "mosaic", "block", "retro", "pixel"],
	params: [
		{
			key: "blockSize",
			label: "Block Size",
			type: "number",
			default: 10,
			min: 2,
			max: 100,
			step: 1,
		},
	],
	renderer: {
		type: "webgl",
		passes: [
			{
				fragmentShader,
				uniforms: ({ effectParams }) => ({
					u_blockSize: getNumberParam(effectParams, "blockSize", 10),
				}),
			},
		],
	},
};
