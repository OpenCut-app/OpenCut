import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TextPropertiesTab = "transform" | "style";

export interface TextPropertiesTabMeta {
  value: TextPropertiesTab;
  label: string;
}

export const TEXT_PROPERTIES_TABS: ReadonlyArray<TextPropertiesTabMeta> = [
  { value: "transform", label: "Transform" },
  { value: "style", label: "Style" },
] as const;

export function isTextPropertiesTab(value: string): value is TextPropertiesTab {
  return TEXT_PROPERTIES_TABS.some((t) => t.value === value);
}

interface TextPropertiesState {
  activeTab: TextPropertiesTab;
  setActiveTab: (tab: TextPropertiesTab) => void;
}

export const useTextPropertiesStore = create<TextPropertiesState>()(
  persist(
    (set) => ({
      activeTab: "transform",
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: "text-properties" }
  )
);
