import type { FrameRate } from "opencut-wasm";
import { EXPORT_MIME_TYPES } from "@/constants/export-constants";

export const EXPORT_QUALITY_VALUES = [
	"low",
	"medium",
	"high",
	"very_high",
] as const;

export const EXPORT_FORMAT_VALUES = ["mp4", "webm"] as const;

export type ExportFormat = (typeof EXPORT_FORMAT_VALUES)[number];
export type ExportQuality = (typeof EXPORT_QUALITY_VALUES)[number];

export const PLATFORM_PRESET_VALUES = [
	"custom",
	"youtube",
	"tiktok",
	"instagram_reels",
	"instagram_post",
	"twitter",
] as const;

export type PlatformPreset = (typeof PLATFORM_PRESET_VALUES)[number];

export interface PlatformPresetConfig {
	label: string;
	width: number;
	height: number;
	format: ExportFormat;
	quality: ExportQuality;
}

export const PLATFORM_PRESETS: Record<
	Exclude<PlatformPreset, "custom">,
	PlatformPresetConfig
> = {
	youtube: {
		label: "YouTube (1920x1080)",
		width: 1920,
		height: 1080,
		format: "mp4",
		quality: "very_high",
	},
	tiktok: {
		label: "TikTok (1080x1920)",
		width: 1080,
		height: 1920,
		format: "mp4",
		quality: "high",
	},
	instagram_reels: {
		label: "Instagram Reels (1080x1920)",
		width: 1080,
		height: 1920,
		format: "mp4",
		quality: "high",
	},
	instagram_post: {
		label: "Instagram Post (1080x1080)",
		width: 1080,
		height: 1080,
		format: "mp4",
		quality: "high",
	},
	twitter: {
		label: "Twitter/X (1280x720)",
		width: 1280,
		height: 720,
		format: "mp4",
		quality: "high",
	},
};

export interface ExportOptions {
	format: ExportFormat;
	quality: ExportQuality;
	fps?: FrameRate;
	includeAudio?: boolean;
	width?: number;
	height?: number;
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
