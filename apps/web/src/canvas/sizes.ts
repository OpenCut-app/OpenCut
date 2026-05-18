import type { TCanvasSize, TProjectType } from "@/project/types";

/**
 * A canvas preset bundles the raw size with display metadata (label,
 * aspect ratio) and the project intent it implies. UIs should prefer
 * NAMED_CANVAS_PRESETS when rendering preset pickers; consumers that
 * only need the size array continue to use DEFAULT_CANVAS_PRESETS.
 */
export interface TCanvasPreset {
	id: string;
	label: string;
	size: TCanvasSize;
	aspectRatio: string;
	projectType?: TProjectType;
}

export const NAMED_CANVAS_PRESETS: readonly TCanvasPreset[] = [
	{
		id: "landscape-1080p",
		label: "Landscape 1920×1080",
		size: { width: 1920, height: 1080 },
		aspectRatio: "16:9",
		projectType: "standard",
	},
	{
		id: "shorts-1080x1920",
		label: "YouTube Shorts (1080×1920)",
		size: { width: 1080, height: 1920 },
		aspectRatio: "9:16",
		projectType: "shorts",
	},
	{
		id: "square-1080",
		label: "Square 1080×1080",
		size: { width: 1080, height: 1080 },
		aspectRatio: "1:1",
		projectType: "standard",
	},
	{
		id: "landscape-1440",
		label: "Landscape 1440×1080",
		size: { width: 1440, height: 1080 },
		aspectRatio: "4:3",
		projectType: "standard",
	},
];

/**
 * Convenience reference to the YouTube Shorts preset.
 */
export const SHORTS_CANVAS_PRESET: TCanvasPreset = NAMED_CANVAS_PRESETS.find(
	(p) => p.id === "shorts-1080x1920",
)!;

/**
 * Back-compat: existing consumers (editor-store, etc.) read a bare
 * TCanvasSize[]. Derived from NAMED_CANVAS_PRESETS to keep them in sync.
 */
export const DEFAULT_CANVAS_PRESETS: TCanvasSize[] = NAMED_CANVAS_PRESETS.map(
	(p) => p.size,
);

export const DEFAULT_CANVAS_SIZE: TCanvasSize = NAMED_CANVAS_PRESETS[0].size;
