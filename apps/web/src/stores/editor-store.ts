import { create } from "zustand";
import { DEFAULT_CANVAS_PRESETS } from "@/constants/project-constants";
import type { TCanvasSize } from "@/types/project";

interface EditorState {
	isInitializing: boolean;
	isPanelsReady: boolean;
	canvasPresets: TCanvasSize[];
	setInitializing: (loading: boolean) => void;
	setPanelsReady: (ready: boolean) => void;
	initializeApp: () => Promise<void>;
}

export const useEditorStore = create<EditorState>()((set) => ({
	isInitializing: true,
	isPanelsReady: false,
	canvasPresets: DEFAULT_CANVAS_PRESETS,
	setInitializing: (loading) => set({ isInitializing: loading }),
	setPanelsReady: (ready) => set({ isPanelsReady: ready }),
	initializeApp: async () => {
		set({ isInitializing: true, isPanelsReady: false });
		set({ isPanelsReady: true, isInitializing: false });
	},
}));
