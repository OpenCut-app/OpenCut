import type { FrameRate } from "opencut-wasm";
import type { TScene } from "@/timeline/types";
import type { MediaTime } from "@/wasm";

export const PROJECT_TYPES = ["standard", "shorts"] as const;
/**
 * Project intent. "shorts" indicates a vertical 9:16 short-form project
 * (e.g. YouTube Shorts) — drives preset pickers, export defaults, and
 * vertical-safe text positioning. "standard" covers landscape, square,
 * and other non-Shorts aspect ratios.
 */
export type TProjectType = (typeof PROJECT_TYPES)[number];

export type TBackground =
	| {
			type: "color";
			color: string;
	  }
	| {
			type: "blur";
			blurIntensity: number;
	  };

export interface TCanvasSize {
	width: number;
	height: number;
}

export interface TProjectMetadata {
	id: string;
	name: string;
	thumbnail?: string;
	duration: MediaTime;
	createdAt: Date;
	updatedAt: Date;
	/**
	 * Discriminator for project intent. Optional for back-compat — undefined on
	 * projects created before this field existed; consumers MUST treat undefined
	 * as "standard" (e.g. `projectType ?? "standard"`). New projects always set
	 * this explicitly via ProjectManager.createNewProject.
	 */
	projectType?: TProjectType;
}

export interface TProjectSettings {
	fps: FrameRate;
	canvasSize: TCanvasSize;
	canvasSizeMode?: "preset" | "custom";
	lastCustomCanvasSize?: TCanvasSize | null;
	originalCanvasSize?: TCanvasSize | null;
	background: TBackground;
}

export interface TTimelineViewState {
	zoomLevel: number;
	scrollLeft: number;
	playheadTime: MediaTime;
}

export interface TProject {
	metadata: TProjectMetadata;
	scenes: TScene[];
	currentSceneId: string;
	settings: TProjectSettings;
	version: number;
	timelineViewState?: TTimelineViewState;
}

export type TProjectSortKey = "createdAt" | "updatedAt" | "name" | "duration";
export type TSortOrder = "asc" | "desc";
export type TProjectSortOption = `${TProjectSortKey}-${TSortOrder}`;
