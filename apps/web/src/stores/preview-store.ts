import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TPlatformLayout } from "@/types/editor";

interface LayoutGuideSettings {
	platform: TPlatformLayout | null;
}

interface PreviewOverlaysState {
	bookmarks: boolean;
}

interface PreviewState {
	layoutGuide: LayoutGuideSettings;
	overlays: PreviewOverlaysState;
	setLayoutGuide: (settings: Partial<LayoutGuideSettings>) => void;
	toggleLayoutGuide: (platform: TPlatformLayout) => void;
	setOverlayVisibility: ({
		overlay,
		isVisible,
	}: {
		overlay: keyof PreviewOverlaysState;
		isVisible: boolean;
	}) => void;
	toggleOverlayVisibility: ({
		overlay,
	}: {
		overlay: keyof PreviewOverlaysState;
	}) => void;
}

const DEFAULT_PREVIEW_OVERLAYS: PreviewOverlaysState = {
	bookmarks: true,
};

export const usePreviewStore = create<PreviewState>()(
	persist(
		(set) => ({
			layoutGuide: { platform: null },
			overlays: DEFAULT_PREVIEW_OVERLAYS,
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
			setOverlayVisibility: ({ overlay, isVisible }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlay]: isVisible,
					},
				}));
			},
			toggleOverlayVisibility: ({ overlay }) => {
				set((state) => ({
					overlays: {
						...state.overlays,
						[overlay]: !state.overlays[overlay],
					},
				}));
			},
		}),
		{
			name: "preview-settings",
			version: 2,
			migrate: (persistedState) => {
				const state = persistedState as
					| {
							layoutGuide?: LayoutGuideSettings;
							overlays?: PreviewOverlaysState;
					  }
					| undefined;
				return {
					layoutGuide: state?.layoutGuide ?? { platform: null },
					overlays: state?.overlays ?? DEFAULT_PREVIEW_OVERLAYS,
				};
			},
			partialize: (state) => ({
				layoutGuide: state.layoutGuide,
				overlays: state.overlays,
			}),
		},
	),
);
