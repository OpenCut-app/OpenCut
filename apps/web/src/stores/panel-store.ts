import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PanelPreset =
  | "default"
  | "media"
  | "inspector"
  | "vertical-preview";

interface PanelSizes {
  toolsPanel: number;
  previewPanel: number;
  propertiesPanel: number;
  mainContent: number;
  timeline: number;
}

export const PRESET_CONFIGS: Record<PanelPreset, PanelSizes> = {
  default: {
    toolsPanel: 25,
    previewPanel: 50,
    propertiesPanel: 25,
    mainContent: 70,
    timeline: 30,
  },
  media: {
    toolsPanel: 30,
    previewPanel: 45,
    propertiesPanel: 25,
    mainContent: 100,
    timeline: 25,
  },
  inspector: {
    toolsPanel: 30,
    previewPanel: 70,
    propertiesPanel: 30,
    mainContent: 75,
    timeline: 25,
  },
  "vertical-preview": {
    toolsPanel: 30,
    previewPanel: 40,
    propertiesPanel: 30,
    mainContent: 75,
    timeline: 25,
  },
};

interface PanelState extends PanelSizes {
  activePreset: PanelPreset;
  presetCustomSizes: Record<PanelPreset, Partial<PanelSizes>>;
  resetCounter: number;

  mediaViewMode: "grid" | "list";

  setToolsPanel: (size: number) => void;
  setPreviewPanel: (size: number) => void;
  setPropertiesPanel: (size: number) => void;
  setMainContent: (size: number) => void;
  setTimeline: (size: number) => void;
  setMediaViewMode: (mode: "grid" | "list") => void;

  setActivePreset: (preset: PanelPreset) => void;
  resetPreset: (preset: PanelPreset) => void;
  getCurrentPresetSizes: () => PanelSizes;
}

export const usePanelStore = create<PanelState>()(
  persist(
    (set, get) => ({
      ...PRESET_CONFIGS.default,
      activePreset: "default" as PanelPreset,
      presetCustomSizes: {
        default: {},
        media: {},
        inspector: {},
        "vertical-preview": {},
      },
      resetCounter: 0,

      mediaViewMode: "grid" as const,

      setToolsPanel: (size) => {
        const { activePreset, presetCustomSizes } = get();
        set({
          toolsPanel: size,
          presetCustomSizes: {
            ...presetCustomSizes,
            [activePreset]: {
              ...presetCustomSizes[activePreset],
              toolsPanel: size,
            },
          },
        });
      },
      setPreviewPanel: (size) => {
        const { activePreset, presetCustomSizes } = get();
        set({
          previewPanel: size,
          presetCustomSizes: {
            ...presetCustomSizes,
            [activePreset]: {
              ...presetCustomSizes[activePreset],
              previewPanel: size,
            },
          },
        });
      },
      setPropertiesPanel: (size) => {
        const { activePreset, presetCustomSizes } = get();
        set({
          propertiesPanel: size,
          presetCustomSizes: {
            ...presetCustomSizes,
            [activePreset]: {
              ...presetCustomSizes[activePreset],
              propertiesPanel: size,
            },
          },
        });
      },
      setMainContent: (size) => {
        const { activePreset, presetCustomSizes } = get();
        set({
          mainContent: size,
          presetCustomSizes: {
            ...presetCustomSizes,
            [activePreset]: {
              ...presetCustomSizes[activePreset],
              mainContent: size,
            },
          },
        });
      },
      setTimeline: (size) => {
        const { activePreset, presetCustomSizes } = get();
        set({
          timeline: size,
          presetCustomSizes: {
            ...presetCustomSizes,
            [activePreset]: {
              ...presetCustomSizes[activePreset],
              timeline: size,
            },
          },
        });
      },
      setMediaViewMode: (mode) => set({ mediaViewMode: mode }),

      setActivePreset: (preset) => {
        const {
          activePreset: currentPreset,
          presetCustomSizes,
          toolsPanel,
          previewPanel,
          propertiesPanel,
          mainContent,
          timeline,
        } = get();

        const updatedPresetCustomSizes = {
          ...presetCustomSizes,
          [currentPreset]: {
            toolsPanel,
            previewPanel,
            propertiesPanel,
            mainContent,
            timeline,
          },
        };

        const defaultSizes = PRESET_CONFIGS[preset];
        const customSizes = updatedPresetCustomSizes[preset] || {};
        const finalSizes = { ...defaultSizes, ...customSizes } as PanelSizes;

        set({
          activePreset: preset,
          presetCustomSizes: updatedPresetCustomSizes,
          ...finalSizes,
        });
      },

      resetPreset: (preset) => {
        const { presetCustomSizes, activePreset, resetCounter } = get();
        const defaultSizes = PRESET_CONFIGS[preset];

        const newPresetCustomSizes = {
          ...presetCustomSizes,
          [preset]: {},
        };

        const updates: Partial<PanelState> = {
          presetCustomSizes: newPresetCustomSizes,
          resetCounter: resetCounter + 1,
        };

        if (preset === activePreset) {
          Object.assign(updates, defaultSizes);
        }

        set(updates);
      },

      getCurrentPresetSizes: () => {
        const {
          toolsPanel,
          previewPanel,
          propertiesPanel,
          mainContent,
          timeline,
        } = get();
        return {
          toolsPanel,
          previewPanel,
          propertiesPanel,
          mainContent,
          timeline,
        };
      },
    }),
    {
      name: "panel-sizes",
    }
  )
);
