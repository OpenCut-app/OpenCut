import type { TProjectType } from "@/project/types";
import { YOUTUBE_SHORTS_EXPORT_PRESET, type ExportOptions } from "./index";

export const DEFAULT_EXPORT_OPTIONS = {
	format: "mp4",
	quality: "high",
	includeAudio: true,
} satisfies ExportOptions;

/**
 * Resolve the export options that should be pre-filled when opening
 * the export dialog for a given project. Projects with intent === "shorts"
 * get the YouTube Shorts preset's options; everything else uses
 * DEFAULT_EXPORT_OPTIONS. Undefined projectType (back-compat for older
 * stored projects) is treated as "standard".
 */
export function getDefaultExportOptions({
	projectType,
}: {
	projectType?: TProjectType;
}): ExportOptions {
	if (projectType === "shorts") {
		return { ...YOUTUBE_SHORTS_EXPORT_PRESET.options };
	}
	return { ...DEFAULT_EXPORT_OPTIONS };
}
