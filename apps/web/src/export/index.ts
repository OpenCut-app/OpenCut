import type { FrameRate } from "opencut-wasm";
import { EXPORT_MIME_TYPES } from "./mime-types";

export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

export interface ExportOptions {
	format: ExportFormat;
	quality: ExportQuality;
	fps?: FrameRate;
	includeAudio?: boolean;
}

// ─── Export presets ─────────────────────────────────────────────────────────

export const EXPORT_PRESET_IDS = ["youtube-shorts"] as const;

/**
 * Discriminator for export presets. "youtube-shorts" applies the
 * YouTube-recommended encoding shape for 1080×1920 vertical short videos.
 * New presets will be added here as their UI surface lands.
 */
export type TExportPresetId = (typeof EXPORT_PRESET_IDS)[number];

export interface TExportPreset {
	id: TExportPresetId;
	label: string;
	description: string;
	options: ExportOptions;
}

/**
 * YouTube Shorts encoding preset. Targets YouTube's recommended
 * encoding shape: H.264 MP4, very_high quality (the bitrate mapping
 * lives downstream in the renderer/WASM layer), audio included.
 * FPS is intentionally not set — projects keep their own FPS, which
 * for Shorts is typically 30 or 60.
 */
export const YOUTUBE_SHORTS_EXPORT_PRESET: TExportPreset = {
	id: "youtube-shorts",
	label: "YouTube Shorts",
	description: "1080×1920 vertical, H.264 MP4 at very_high quality, AAC audio",
	options: {
		format: "mp4",
		quality: "very_high",
		includeAudio: true,
	},
};

export const EXPORT_PRESETS: readonly TExportPreset[] = [
	YOUTUBE_SHORTS_EXPORT_PRESET,
];

export function getExportPresetById({
	id,
}: {
	id: TExportPresetId;
}): TExportPreset | undefined {
	return EXPORT_PRESETS.find((p) => p.id === id);
}

export interface ExportResult {
	success: boolean;
	buffer?: ArrayBuffer;
	error?: string;
	cancelled?: boolean;
}

export interface ExportState {
	isExporting: boolean;
	progress: number;
	result: ExportResult | null;
}

export function getExportMimeType({
	format,
}: {
	format: ExportFormat;
}): string {
	return EXPORT_MIME_TYPES[format];
}

export function getExportFileExtension({
	format,
}: {
	format: ExportFormat;
}): string {
	return `.${format}`;
}

export function downloadBuffer({
	buffer,
	filename,
	mimeType,
}: {
	buffer: ArrayBuffer;
	filename: string;
	mimeType: string;
}): void {
	const blob = new Blob([buffer], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const downloadLink = document.createElement("a");
	downloadLink.href = url;
	downloadLink.download = filename;
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
	URL.revokeObjectURL(url);
}
