/** A single effect entry within a preset */
export interface EffectPresetEntry {
	/** Must match a registered effect type (e.g., "brightness") */
	effectType: string;
	params: Record<string, number | string | boolean>;
}

export type PresetCategory = "instagram" | "cinematic" | "beauty" | "custom";

/** Curated combination of effects with preset parameter values */
export interface EffectPreset {
	type: string;
	name: string;
	category: PresetCategory;
	description: string;
	effects: EffectPresetEntry[];
}
