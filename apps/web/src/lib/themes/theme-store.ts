"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { NEURALCUT_PALETTE } from "./palettes/neuralcut";

interface ThemeState {
	paletteId: string;
	setPalette: (id: string) => void;
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			paletteId: NEURALCUT_PALETTE.id,
			setPalette: (id: string) => set({ paletteId: id }),
		}),
		{
			name: "neuralcut-theme",
		},
	),
);
