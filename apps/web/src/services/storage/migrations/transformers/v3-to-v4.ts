import type { MigrationResult, ProjectRecord } from "./types";
import { getProjectId, isRecord } from "./utils";

const LEGACY_FONT_WEIGHT_MAP = {
	normal: "400",
	bold: "700",
} as const;

const VALID_NUMERIC_FONT_WEIGHTS = new Set([
	"100",
	"200",
	"300",
	"400",
	"500",
	"600",
	"700",
	"800",
	"900",
]);

export function transformProjectV3ToV4({
	project,
}: {
	project: ProjectRecord;
}): MigrationResult<ProjectRecord> {
	const projectId = getProjectId({ project });
	if (!projectId) {
		return { project, skipped: true, reason: "no project id" };
	}

	if (isV4Project({ project })) {
		return { project, skipped: true, reason: "already v4" };
	}

	const migratedProject = normalizeProjectTextFontWeights({ project });

	return {
		project: {
			...migratedProject,
			version: 4,
		},
		skipped: false,
	};
}

function normalizeProjectTextFontWeights({
	project,
}: {
	project: ProjectRecord;
}): ProjectRecord {
	const scenesValue = project.scenes;
	if (!Array.isArray(scenesValue)) {
		return project;
	}

	let hasSceneChanges = false;
	const normalizedScenes = scenesValue.map((scene) => {
		const normalizedScene = normalizeSceneTextFontWeights({ scene });
		if (normalizedScene !== scene) {
			hasSceneChanges = true;
		}
		return normalizedScene;
	});

	if (!hasSceneChanges) {
		return project;
	}

	return {
		...project,
		scenes: normalizedScenes,
	};
}

function normalizeSceneTextFontWeights({ scene }: { scene: unknown }): unknown {
	if (!isRecord(scene)) {
		return scene;
	}

	const tracksValue = scene.tracks;
	if (!Array.isArray(tracksValue)) {
		return scene;
	}

	let hasTrackChanges = false;
	const normalizedTracks = tracksValue.map((track) => {
		const normalizedTrack = normalizeTrackTextFontWeights({ track });
		if (normalizedTrack !== track) {
			hasTrackChanges = true;
		}
		return normalizedTrack;
	});

	if (!hasTrackChanges) {
		return scene;
	}

	return {
		...scene,
		tracks: normalizedTracks,
	};
}

function normalizeTrackTextFontWeights({ track }: { track: unknown }): unknown {
	if (!isRecord(track)) {
		return track;
	}

	if (track.type !== "text") {
		return track;
	}

	const elementsValue = track.elements;
	if (!Array.isArray(elementsValue)) {
		return track;
	}

	let hasElementChanges = false;
	const normalizedElements = elementsValue.map((element) => {
		const normalizedElement = normalizeTextElementFontWeight({ element });
		if (normalizedElement !== element) {
			hasElementChanges = true;
		}
		return normalizedElement;
	});

	if (!hasElementChanges) {
		return track;
	}

	return {
		...track,
		elements: normalizedElements,
	};
}

function normalizeTextElementFontWeight({
	element,
}: {
	element: unknown;
}): unknown {
	if (!isRecord(element) || element.type !== "text") {
		return element;
	}

	const normalizedWeight = normalizeFontWeight({ value: element.fontWeight });
	if (normalizedWeight === element.fontWeight) {
		return element;
	}

	return {
		...element,
		fontWeight: normalizedWeight,
	};
}

function normalizeFontWeight({ value }: { value: unknown }): unknown {
	if (typeof value === "number") {
		const numericWeight = String(value);
		if (VALID_NUMERIC_FONT_WEIGHTS.has(numericWeight)) {
			return numericWeight;
		}
		return value;
	}

	if (typeof value !== "string") {
		return value;
	}

	const normalized = value.trim().toLowerCase();
	if (normalized in LEGACY_FONT_WEIGHT_MAP) {
		return LEGACY_FONT_WEIGHT_MAP[
			normalized as keyof typeof LEGACY_FONT_WEIGHT_MAP
		];
	}

	if (VALID_NUMERIC_FONT_WEIGHTS.has(normalized)) {
		return normalized;
	}

	return value;
}

export { getProjectId } from "./utils";

function isV4Project({ project }: { project: ProjectRecord }): boolean {
	const versionValue = project.version;
	return typeof versionValue === "number" && versionValue >= 4;
}
