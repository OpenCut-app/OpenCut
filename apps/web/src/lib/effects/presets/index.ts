export type { EffectPreset, EffectPresetEntry, PresetCategory } from "./types";
export {
	registerPreset,
	getPreset,
	hasPreset,
	getAllPresets,
	getPresetsByCategory,
	clearPresets,
} from "./registry";

import { registerPreset, hasPreset } from "./registry";
import { instagramPresets } from "./instagram-filters";
import { cinematicPresets } from "./cinematic-presets";
import { beautyPresets } from "./beauty-presets";

/** All bundled presets */
const allPresets = [...instagramPresets, ...cinematicPresets, ...beautyPresets];

/** Register all bundled presets (skips already-registered) */
export function registerDefaultPresets(): void {
	for (const preset of allPresets) {
		if (hasPreset(preset.type)) continue;
		registerPreset(preset);
	}
}

/** Get all bundled presets without registering */
export function getAllBundledPresets(): typeof allPresets {
	return [...allPresets];
}
