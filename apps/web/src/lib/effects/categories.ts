/** Effect categories for UI grouping */
export const EffectCategory = {
	COLOR_TONE: "color-tone",
	ARTISTIC: "artistic",
	BEAUTY: "beauty",
} as const;

export type EffectCategory =
	(typeof EffectCategory)[keyof typeof EffectCategory];

export interface EffectCategoryMeta {
	label: string;
	description: string;
}

/** Display metadata for each effect category */
export const EFFECT_CATEGORY_META: Record<EffectCategory, EffectCategoryMeta> =
	{
		[EffectCategory.COLOR_TONE]: {
			label: "Color & Tone",
			description: "Brightness, contrast, saturation, and color adjustments",
		},
		[EffectCategory.ARTISTIC]: {
			label: "Artistic",
			description: "Stylize effects like blur, vignette, and film grain",
		},
		[EffectCategory.BEAUTY]: {
			label: "Beauty",
			description: "Face-aware beauty effects using AI detection",
		},
	};
