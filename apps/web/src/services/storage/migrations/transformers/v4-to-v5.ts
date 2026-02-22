import type { MigrationResult, ProjectRecord } from "./types";
import { getProjectId, isRecord } from "./utils";

const KNOWN_STICKER_PROVIDER_IDS = new Set([
	"icons",
	"emoji",
	"flags",
	"shapes",
]);

export function transformProjectV4ToV5({
	project,
}: {
	project: ProjectRecord;
}): MigrationResult<ProjectRecord> {
	const projectId = getProjectId({ project });
	if (!projectId) {
		return { project, skipped: true, reason: "no project id" };
	}

	if (isV5Project({ project })) {
		return { project, skipped: true, reason: "already v5" };
	}

	const migratedProject = migrateProjectStickerElements({ project });

	return {
		project: {
			...migratedProject,
			version: 5,
		},
		skipped: false,
	};
}

function migrateProjectStickerElements({
	project,
}: {
	project: ProjectRecord;
}): ProjectRecord {
	const scenesValue = project.scenes;
	if (!Array.isArray(scenesValue)) {
		return project;
	}

	let hasSceneChanges = false;
	const migratedScenes = scenesValue.map((scene) => {
		const migratedScene = migrateSceneStickerElements({ scene });
		if (migratedScene !== scene) {
			hasSceneChanges = true;
		}
		return migratedScene;
	});

	if (!hasSceneChanges) {
		return project;
	}

	return {
		...project,
		scenes: migratedScenes,
	};
}

function migrateSceneStickerElements({ scene }: { scene: unknown }): unknown {
	if (!isRecord(scene)) {
		return scene;
	}

	const tracksValue = scene.tracks;
	if (!Array.isArray(tracksValue)) {
		return scene;
	}

	let hasTrackChanges = false;
	const migratedTracks = tracksValue.map((track) => {
		const migratedTrack = migrateTrackStickerElements({ track });
		if (migratedTrack !== track) {
			hasTrackChanges = true;
		}
		return migratedTrack;
	});

	if (!hasTrackChanges) {
		return scene;
	}

	return {
		...scene,
		tracks: migratedTracks,
	};
}

function migrateTrackStickerElements({ track }: { track: unknown }): unknown {
	if (!isRecord(track)) {
		return track;
	}

	const elementsValue = track.elements;
	if (!Array.isArray(elementsValue)) {
		return track;
	}

	let hasElementChanges = false;
	const migratedElements = elementsValue.map((element) => {
		const migratedElement = migrateStickerElement({ element });
		if (migratedElement !== element) {
			hasElementChanges = true;
		}
		return migratedElement;
	});

	if (!hasElementChanges) {
		return track;
	}

	return {
		...track,
		elements: migratedElements,
	};
}

function migrateStickerElement({ element }: { element: unknown }): unknown {
	if (!isRecord(element) || element.type !== "sticker") {
		return element;
	}

	const existingStickerId =
		typeof element.stickerId === "string" ? element.stickerId : null;
	const legacyIconName =
		typeof element.iconName === "string" ? element.iconName : null;

	const normalizedStickerId =
		normalizeStickerId({
			value: existingStickerId ?? legacyIconName,
		}) ?? null;

	const hasLegacyIconName = "iconName" in element;
	const hasLegacyColor = "color" in element;
	const shouldUpdateStickerId = normalizedStickerId !== existingStickerId;

	if (!hasLegacyIconName && !hasLegacyColor && !shouldUpdateStickerId) {
		return element;
	}

	const {
		iconName: _legacyIconName,
		color: _legacyColor,
		...remaining
	} = element;
	return normalizedStickerId
		? { ...remaining, stickerId: normalizedStickerId }
		: remaining;
}

function normalizeStickerId({ value }: { value: unknown }): string | null {
	if (typeof value !== "string" || value.length === 0) {
		return null;
	}

	const separatorIndex = value.indexOf(":");
	if (separatorIndex === -1) {
		return `icons:${value}`;
	}

	const maybeProvider = value.slice(0, separatorIndex);
	if (KNOWN_STICKER_PROVIDER_IDS.has(maybeProvider)) {
		return value;
	}

	return `icons:${value}`;
}

function isV5Project({ project }: { project: ProjectRecord }): boolean {
	const versionValue = project.version;
	return typeof versionValue === "number" && versionValue >= 5;
}
