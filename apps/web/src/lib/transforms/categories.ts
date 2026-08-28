/** Transform categories for UI grouping */
export const TransformCategory = {
	SPATIAL: "spatial",
	VISUAL: "visual",
	TRANSITION: "transition",
} as const;

export type TransformCategory =
	(typeof TransformCategory)[keyof typeof TransformCategory];

export interface TransformCategoryMeta {
	label: string;
	description: string;
}

/** Display metadata for each transform category */
export const TRANSFORM_CATEGORY_META: Record<
	TransformCategory,
	TransformCategoryMeta
> = {
	[TransformCategory.SPATIAL]: {
		label: "Spatial",
		description: "Scale, rotate, translate, flip, and crop transforms",
	},
	[TransformCategory.VISUAL]: {
		label: "Visual",
		description: "Lens distortion, perspective, and warp effects",
	},
	[TransformCategory.TRANSITION]: {
		label: "Transitions",
		description: "Clip-to-clip transitions like fade, wipe, and slide",
	},
};
