import type { EffectPreset, PresetCategory } from "./types";

const presetMap = new Map<string, EffectPreset>();

export function registerPreset(preset: EffectPreset): void {
	presetMap.set(preset.type, preset);
}

export function getPreset(type: string): EffectPreset {
	const preset = presetMap.get(type);
	if (!preset) throw new Error(`Unknown preset: ${type}`);
	return preset;
}

export function hasPreset(type: string): boolean {
	return presetMap.has(type);
}

export function getAllPresets(): EffectPreset[] {
	return Array.from(presetMap.values());
}

export function getPresetsByCategory(category: PresetCategory): EffectPreset[] {
	return getAllPresets().filter((preset) => preset.category === category);
}

export function clearPresets(): void {
	presetMap.clear();
}
