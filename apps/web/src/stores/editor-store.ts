import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CanvasPreset } from "@/types/editor";

export type PlatformLayout = "tiktok";

export const PLATFORM_LAYOUTS: Record<PlatformLayout, string> = {
  tiktok: "TikTok",
};

interface LayoutGuideSettings {
  platform: PlatformLayout | null;
}

interface EditorState {
  // Loading states
  isInitializing: boolean;
  isPanelsReady: boolean;

  // Editor UI settings
  canvasPresets: CanvasPreset[];
  layoutGuide: LayoutGuideSettings;

  // Actions
  setInitializing: (loading: boolean) => void;
  setPanelsReady: (ready: boolean) => void;
  initializeApp: () => Promise<void>;
  setLayoutGuide: (settings: Partial<LayoutGuideSettings>) => void;
  toggleLayoutGuide: (platform: PlatformLayout) => void;
}

const DEFAULT_CANVAS_PRESETS: CanvasPreset[] = [
  { name: "16:9", width: 1920, height: 1080 },
  { name: "9:16", width: 1080, height: 1920 },
  { name: "1:1", width: 1080, height: 1080 },
  { name: "4:3", width: 1440, height: 1080 },
];

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      // Initial states
      isInitializing: true,
      isPanelsReady: false,
      canvasPresets: DEFAULT_CANVAS_PRESETS,
      layoutGuide: {
        platform: null,
      },

      // Actions
      setInitializing: (loading) => {
        set({ isInitializing: loading });
      },

      setPanelsReady: (ready) => {
        set({ isPanelsReady: ready });
      },

      initializeApp: async () => {
        console.log("Initializing video editor...");
        set({ isInitializing: true, isPanelsReady: false });

        set({ isPanelsReady: true, isInitializing: false });
        console.log("Video editor ready");
      },

      setLayoutGuide: (settings) => {
        set((state) => ({
          layoutGuide: {
            ...state.layoutGuide,
            ...settings,
          },
        }));
      },

      toggleLayoutGuide: (platform) => {
        set((state) => ({
          layoutGuide: {
            platform: state.layoutGuide.platform === platform ? null : platform,
          },
        }));
      },
    }),
    {
      name: "editor-settings",
      partialize: (state) => ({
        layoutGuide: state.layoutGuide,
      }),
    }
  )
);
