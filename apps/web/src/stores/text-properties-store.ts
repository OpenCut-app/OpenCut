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

/**
 * Checks whether a string corresponds to a valid text properties tab.
 *
 * @param value - The string to test for membership in the known text properties tabs
 * @returns `true` if `value` is a valid TextPropertiesTab, `false` otherwise
 */
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