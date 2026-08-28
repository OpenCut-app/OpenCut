import type { TransformPreset, TransformPresetCategory } from "./types";

const presetMap = new Map<string, TransformPreset>();

export function registerPreset(preset: TransformPreset): void {
	presetMap.set(preset.type, preset);
}

export function getPreset(type: string): TransformPreset {
	const preset = presetMap.get(type);
	if (!preset) throw new Error(`Unknown transform preset: ${type}`);
	return preset;
}

export function hasPreset(type: string): boolean {
	return presetMap.has(type);
}

export function getAllPresets(): TransformPreset[] {
	return Array.from(presetMap.values());
}

export function getPresetsByCategory(
	category: TransformPresetCategory,
): TransformPreset[] {
	return getAllPresets().filter((preset) => preset.category === category);
}

export function clearPresets(): void {
	presetMap.clear();
}
