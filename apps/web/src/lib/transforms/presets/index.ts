export type {
	TransformPreset,
	TransformPresetEntry,
	TransformPresetCategory,
} from "./types";
export {
	registerPreset,
	getPreset,
	hasPreset,
	getAllPresets,
	getPresetsByCategory,
	clearPresets,
} from "./registry";

import { registerPreset, hasPreset } from "./registry";
import { kenBurnsPreset, kenBurnsReversePreset } from "./ken-burns";
import {
	cinematicZoomInPreset,
	cinematicZoomOutPreset,
} from "./cinematic-zoom";
import { rotateRevealPreset, spinExitPreset } from "./rotate-reveal";

/** All bundled transform presets */
const allPresets = [
	kenBurnsPreset,
	kenBurnsReversePreset,
	cinematicZoomInPreset,
	cinematicZoomOutPreset,
	rotateRevealPreset,
	spinExitPreset,
];

/** Register all bundled transform presets (skips already-registered) */
export function registerDefaultPresets(): void {
	for (const preset of allPresets) {
		if (hasPreset(preset.type)) continue;
		registerPreset(preset);
	}
}

/** Get all bundled transform presets without registering */
export function getAllBundledPresets(): typeof allPresets {
	return [...allPresets];
}
