import { NEURALCUT_PALETTE } from "./neuralcut";
import { CLASSIC_PALETTE } from "./classic";
import type { PaletteMeta } from "../types";

export const PALETTES: PaletteMeta[] = [NEURALCUT_PALETTE, CLASSIC_PALETTE];

export function getPaletteById(id: string): PaletteMeta | undefined {
	return PALETTES.find((p) => p.id === id);
}
