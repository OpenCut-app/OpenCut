import type { EditorCore } from "@/core";
import type {
	TProject,
	TProjectMetadata,
	TProjectSortKey,
	TProjectSortOption,
	TProjectSettings,
	TTimelineViewState,
} from "@/lib/project/types";
import type { ExportOptions, ExportResult, ExportState } from "@/lib/export";
import { storageService } from "@/services/storage/service";
import { toast } from "sonner";
import { generateUUID } from "@/utils/id";
import { UpdateProjectSettingsCommand } from "@/lib/commands/project";
import { DEFAULT_BACKGROUND_COLOR } from "@/lib/background/color";
import { DEFAULT_CANVAS_SIZE } from "@/lib/canvas/sizes";
import { DEFAULT_FPS } from "@/lib/fps/defaults";
import { buildDefaultScene, getProjectDurationFromScenes } from "@/lib/scenes";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";
import {
	CURRENT_PROJECT_VERSION,
	migrations,
	runStorageMigrations,
	type MigrationProgress,
} from "@/services/storage/migrations";
import { loadFonts } from "@/lib/fonts/google-fonts";
import { DEFAULTS } from "@/lib/timeline/defaults";
import { getElementFontFamilies } from "@/lib/timeline/element-utils";
import { getRaisedProjectFpsForImportedMedia } from "@/lib/fps/utils";
import type { MediaAsset } from "@/lib/media/types";
import type { SerializedProject } from "@/services/storage/types";

/** Schema version for the JSON export format. Increment when the format changes. */
const EXPORT_SCHEMA_VERSION = 1;

/** Manifest entry describing a media asset referenced by the project. */
export interface ExportedMediaManifestEntry {
	mediaId: string;
	filename: string;
	type: string;
	size: number;
	width?: number;
	height?: number;
	duration?: number;
}

/** Top-level shape of an exported OpenCut project JSON file. */
export interface ExportedProjectJSON {
	schema_version: number;
	exported_at: string;
	project: SerializedProject;
	media: ExportedMediaManifestEntry[];
}

export interface MigrationState {
	isMigrating: boolean;
	fromVersion: number | null;
	toVersion: number | null;
	projectName: string | null;
}

export class ProjectManager {
	private active: TProject | null = null;
	private savedProjects: TProjectMetadata[] = [];
	private isLoading = true;
	private isInitialized = false;
	private invalidProjectIds = new Set<string>();
	private storageMigrationPromise: Promise<void> | null = null;
	private listeners = new Set<() => void>();
	private migrationState: MigrationState = {
		isMigrating: false,
		fromVersion: null,
		toVersion: null,
		projectName: null,
	};
	private exportState: ExportState = {
		isExporting: false,
		progress: 0,
		result: null,
	};
	private exportCancelRequested = false;

	constructor(private editor: EditorCore) {}

	private async ensureStorageMigrations(): Promise<void> {
		if (this.storageMigrationPromise) {
			await this.storageMigrationPromise;
			return;
		}

		this.storageMigrationPromise = (async () => {
			await runStorageMigrations({
				migrations,
				onProgress: (progress: MigrationProgress) => {
					this.migrationState = progress;
					this.notify();
				},
			});
		})();

		await this.storageMigrationPromise;
	}

	async createNewProject({ name }: { name: string }): Promise<string> {
		const mainScene = buildDefaultScene({ name: "Main scene", isMain: true });
		const newProject: TProject = {
			metadata: {
				id: generateUUID(),
				name,
				duration: getProjectDurationFromScenes({ scenes: [mainScene] }),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			scenes: [mainScene],
			currentSceneId: mainScene.id,
			settings: {
				fps: DEFAULT_FPS,
				canvasSize: DEFAULT_CANVAS_SIZE,
				canvasSizeMode: "preset",
				lastCustomCanvasSize: null,
				originalCanvasSize: null,
				background: {
					type: "color",
					color: DEFAULT_BACKGROUND_COLOR,
				},
			},
			version: CURRENT_PROJECT_VERSION,
		};

		this.active = newProject;
		this.notify();

		this.editor.media.clearAllAssets();
		this.editor.scenes.initializeScenes({
			scenes: newProject.scenes,
			currentSceneId: newProject.currentSceneId,
		});

		try {
			await storageService.saveProject({ project: newProject });
			this.updateMetadata(newProject);

			return newProject.metadata.id;
		} catch (error) {
			toast.error("Failed to save new project");
			throw error;
		}
	}

	async loadProject({ id }: { id: string }): Promise<void> {
		if (!this.isInitialized) {
			this.isLoading = true;
			this.notify();
		}

		this.editor.save.pause();
		await this.ensureStorageMigrations();
		this.editor.media.clearAllAssets();
		this.editor.scenes.clearScenes();

		try {
			const result = await storageService.loadProject({ id });
			if (!result) {
				throw new Error(`Project with id ${id} not found`);
			}

			const project = result.project;

			this.active = project;
			this.notify();

			if (project.scenes && project.scenes.length > 0) {
				this.editor.scenes.initializeScenes({
					scenes: project.scenes,
					currentSceneId: project.currentSceneId,
				});
			}

			await this.editor.media.loadProjectMedia({ projectId: id });

			await loadFonts({
				families: [
					...new Set(
						(project.scenes ?? []).flatMap((scene) =>
							getElementFontFamilies({ tracks: scene.tracks }),
						),
					),
				],
			});

			if (!project.metadata.thumbnail) {
				const didUpdateThumbnail = await this.updateThumbnailFromTimeline();
				if (didUpdateThumbnail) {
					await this.saveCurrentProject();
				}
			}
		} catch (error) {
			console.error("Failed to load project:", error);
			throw error;
		} finally {
			this.isLoading = false;
			this.notify();
			this.editor.save.resume();
		}
	}

	async saveCurrentProject(): Promise<void> {
		if (!this.active) return;

		try {
			const scenes = this.editor.scenes.getScenes();
			const updatedProject = {
				...this.active,
				scenes,
				metadata: {
					...this.active.metadata,
					duration: getProjectDurationFromScenes({ scenes }),
					updatedAt: new Date(),
				},
			};

			await storageService.saveProject({ project: updatedProject });
			this.active = updatedProject;
			this.updateMetadata(updatedProject);
		} catch (error) {
			console.error("Failed to save project:", error);
		}
	}

	async export({ options }: { options: ExportOptions }): Promise<ExportResult> {
		this.exportCancelRequested = false;
		this.exportState = { isExporting: true, progress: 0, result: null };
		this.notify();

		const result = await this.editor.renderer.exportProject({
			options,
			onProgress: ({ progress }) => {
				this.exportState = { ...this.exportState, progress };
				this.notify();
			},
			onCancel: () => this.exportCancelRequested,
		});

		this.exportState = {
			isExporting: false,
			progress: this.exportState.progress,
			result,
		};
		this.notify();

		return result;
	}

	cancelExport(): void {
		this.exportCancelRequested = true;
	}

	clearExportState(): void {
		this.exportState = { isExporting: false, progress: 0, result: null };
		this.notify();
	}

	getExportState(): ExportState {
		return this.exportState;
	}

	async loadAllProjects(): Promise<void> {
		if (!this.isInitialized) {
			this.isLoading = true;
			this.notify();
		}

		try {
			await this.ensureStorageMigrations();
			try {
				const metadata = await storageService.loadAllProjectsMetadata();
				this.savedProjects = metadata;
				this.notify();
			} catch (error) {
				console.error("Failed to load projects:", error);
			} finally {
				this.isLoading = false;
				this.isInitialized = true;
				this.notify();
			}
		} catch (error) {
			console.error("Failed to run migrations:", error);
			this.isLoading = false;
			this.isInitialized = true;
			this.notify();
		}
	}

	async deleteProjects({ ids }: { ids: string[] }): Promise<void> {
		const uniqueIds = Array.from(new Set(ids));
		if (uniqueIds.length === 0) return;

		try {
			await Promise.all(
				uniqueIds.map((id) =>
					Promise.all([
						storageService.deleteProjectMedia({ projectId: id }),
						storageService.deleteProject({ id }),
					]),
				),
			);

			const idSet = new Set(uniqueIds);
			this.savedProjects = this.savedProjects.filter(
				(project) => !idSet.has(project.id),
			);

			const shouldClearActive =
				this.active && idSet.has(this.active.metadata.id);

			if (shouldClearActive) {
				this.active = null;
				this.editor.media.clearAllAssets();
				this.editor.scenes.clearScenes();
			}

			this.notify();
		} catch (error) {
			console.error("Failed to delete projects:", error);
		}
	}

	closeProject(): void {
		this.active = null;
		this.notify();

		this.editor.media.clearAllAssets();
		this.editor.scenes.clearScenes();
	}

	async renameProject({
		id,
		name,
	}: {
		id: string;
		name: string;
	}): Promise<void> {
		try {
			const result = await storageService.loadProject({ id });
			if (!result) {
				toast.error("Project not found", {
					description: "Please try again",
				});
				return;
			}

			const updatedProject: TProject = {
				...result.project,
				metadata: {
					...result.project.metadata,
					name,
					updatedAt: new Date(),
				},
			};

			await storageService.saveProject({ project: updatedProject });

			if (this.active?.metadata.id === id) {
				this.active = updatedProject;
				this.notify();
			}

			this.updateMetadata(updatedProject);
		} catch (error) {
			console.error("Failed to rename project:", error);
			toast.error("Failed to rename project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	}

	async duplicateProjects({ ids }: { ids: string[] }): Promise<string[]> {
		const uniqueIds = Array.from(new Set(ids));
		if (uniqueIds.length === 0) return [];

		try {
			const getDuplicateBaseName = ({ name }: { name: string }) => {
				const match = name.match(/^\((\d+)\)\s+(.+)$/);
				const number = match ? Number.parseInt(match[1], 10) : null;
				const baseName = match ? match[2] : name;
				return { baseName, number };
			};

			const loadResults = await Promise.all(
				uniqueIds.map(async (projectId) => {
					const result = await storageService.loadProject({ id: projectId });
					return { projectId, project: result?.project ?? null };
				}),
			);

			const missingProjectIds = loadResults
				.filter((result) => !result.project)
				.map((result) => result.projectId);

			if (missingProjectIds.length > 0) {
				toast.error(
					missingProjectIds.length === 1
						? "Project not found"
						: "Projects not found",
					{
						description:
							missingProjectIds.length === 1
								? "Please try again"
								: "Some projects could not be found",
					},
				);
				throw new Error(`Projects not found: ${missingProjectIds.join(", ")}`);
			}

			const projectsToDuplicate = loadResults.flatMap((result) =>
				result.project ? [result.project] : [],
			);

			const maxNumberByBaseName = new Map<string, number>();

			for (const project of this.savedProjects) {
				const { baseName, number } = getDuplicateBaseName({
					name: project.name,
				});

				if (number === null) continue;

				const currentMax = maxNumberByBaseName.get(baseName);
				if (currentMax === undefined || number > currentMax) {
					maxNumberByBaseName.set(baseName, number);
				}
			}

			const nextNumberByBaseName = new Map<string, number>();
			for (const [baseName, maxNumber] of maxNumberByBaseName) {
				nextNumberByBaseName.set(baseName, maxNumber + 1);
			}

			const duplicationPlans = projectsToDuplicate.map((project) => {
				const { baseName } = getDuplicateBaseName({
					name: project.metadata.name,
				});
				const nextNumber = nextNumberByBaseName.get(baseName) ?? 1;
				nextNumberByBaseName.set(baseName, nextNumber + 1);

				const newProjectId = generateUUID();
				const newProject: TProject = {
					...project,
					metadata: {
						...project.metadata,
						id: newProjectId,
						name: `(${nextNumber}) ${baseName}`,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				};

				return {
					newProjectId,
					newProject,
					sourceProjectId: project.metadata.id,
				};
			});

			await Promise.all(
				duplicationPlans.map(({ newProject }) =>
					storageService.saveProject({ project: newProject }),
				),
			);

			await Promise.all(
				duplicationPlans.map(async ({ sourceProjectId, newProjectId }) => {
					const sourceMediaAssets = await storageService.loadAllMediaAssets({
						projectId: sourceProjectId,
					});

					await Promise.all(
						sourceMediaAssets.map((mediaAsset) =>
							storageService.saveMediaAsset({
								projectId: newProjectId,
								mediaAsset,
							}),
						),
					);
				}),
			);

			for (const { newProject } of duplicationPlans) {
				this.updateMetadata(newProject);
			}

			return duplicationPlans.map((plan) => plan.newProjectId);
		} catch (error) {
			console.error("Failed to duplicate projects:", error);
			toast.error("Failed to duplicate projects", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
			throw error;
		}
	}

	async updateSettings({
		settings,
		pushHistory = true,
	}: {
		settings: Partial<TProjectSettings>;
		pushHistory?: boolean;
	}): Promise<void> {
		if (!this.active) return;

		const command = new UpdateProjectSettingsCommand(settings);
		if (pushHistory) {
			this.editor.command.execute({ command });
			return;
		}

		command.execute();
	}

	ratchetFpsForImportedMedia({
		importedAssets,
	}: {
		importedAssets: Array<Pick<MediaAsset, "type" | "fps">>;
	}): import("opencut-wasm").FrameRate | null {
		if (!this.active) return null;

		const nextFps = getRaisedProjectFpsForImportedMedia({
			currentFps: this.active.settings.fps,
			importedAssets,
		});
		if (nextFps === null) return null;

		new UpdateProjectSettingsCommand({ fps: nextFps }).execute();
		return nextFps;
	}

	async updateThumbnail({ thumbnail }: { thumbnail: string }): Promise<void> {
		if (!this.active) return;

		const updatedProject: TProject = {
			...this.active,
			metadata: { ...this.active.metadata, thumbnail, updatedAt: new Date() },
		};
		this.active = updatedProject;
		this.notify();
		this.updateMetadata(updatedProject);
		this.editor.save.markDirty();
	}

	async prepareExit(): Promise<void> {
		if (!this.active) return;

		try {
			const didUpdateThumbnail = await this.updateThumbnailFromTimeline();
			if (didUpdateThumbnail) {
				await this.editor.save.flush();
			}
		} catch (error) {
			console.error("Failed to generate project thumbnail on exit:", error);
		}
	}

	getFilteredAndSortedProjects({
		searchQuery,
		sortOption,
	}: {
		searchQuery: string;
		sortOption: TProjectSortOption;
	}): TProjectMetadata[] {
		const filteredProjects = this.savedProjects.filter((project) =>
			project.name.toLowerCase().includes(searchQuery.toLowerCase()),
		);

		const [key, order] = sortOption.split("-") as [
			TProjectSortKey,
			"asc" | "desc",
		];

		const sortedProjects = [...filteredProjects].sort((a, b) => {
			const aValue = a[key];
			const bValue = b[key];

			if (order === "asc") {
				if (aValue < bValue) return -1;
				if (aValue > bValue) return 1;
				return 0;
			}
			if (aValue > bValue) return -1;
			if (aValue < bValue) return 1;
			return 0;
		});

		return sortedProjects;
	}

	isInvalidProjectId({ id }: { id: string }): boolean {
		return this.invalidProjectIds.has(id);
	}

	markProjectIdAsInvalid({ id }: { id: string }): void {
		this.invalidProjectIds.add(id);
		this.notify();
	}

	clearInvalidProjectIds(): void {
		this.invalidProjectIds.clear();
		this.notify();
	}

	getActive(): TProject {
		if (!this.active) {
			throw new Error("No active project");
		}
		return this.active;
	}

	/**
	 * for agents:
	 * in most cases, the project is guaranteed to be active, in which getActive() should be used instead.
	 * for very rare cases, this function may be used.
	 */
	getActiveOrNull(): TProject | null {
		return this.active;
	}

	getTimelineViewState(): TTimelineViewState {
		return this.active?.timelineViewState ?? DEFAULTS.timeline.viewState;
	}

	setTimelineViewState({ viewState }: { viewState: TTimelineViewState }): void {
		if (!this.active) return;
		this.active = {
			...this.active,
			timelineViewState: viewState ?? undefined,
		};
		this.editor.save.markDirty();
		this.notify();
	}

	getSavedProjects(): TProjectMetadata[] {
		return this.savedProjects;
	}

	getIsLoading(): boolean {
		return this.isLoading;
	}

	getIsInitialized(): boolean {
		return this.isInitialized;
	}

	getMigrationState(): MigrationState {
		return this.migrationState;
	}

	setActiveProject({ project }: { project: TProject }): void {
		this.active = project;
		this.notify();
	}

	/**
	 * Exports the active project as a JSON file and triggers a browser download.
	 *
	 * The exported file includes the full serialized project data and a media
	 * manifest listing every media asset referenced by the project (filename,
	 * type, dimensions, duration). Media file blobs are **not** included -- the
	 * manifest allows users to re-link media after import.
	 */
	async exportProjectAsJSON(): Promise<void> {
		if (!this.active) {
			toast.error("No active project to export");
			return;
		}

		try {
			const scenes = this.editor.scenes.getScenes();
			const project = {
				...this.active,
				scenes,
				metadata: {
					...this.active.metadata,
					duration: getProjectDurationFromScenes({ scenes }),
					updatedAt: new Date(),
				},
			};

			const serializedScenes = project.scenes.map((scene) => ({
				id: scene.id,
				name: scene.name,
				isMain: scene.isMain,
				tracks: scene.tracks,
				bookmarks: scene.bookmarks,
				createdAt: scene.createdAt.toISOString(),
				updatedAt: scene.updatedAt.toISOString(),
			}));

			const serializedProject: SerializedProject = {
				metadata: {
					id: project.metadata.id,
					name: project.metadata.name,
					thumbnail: project.metadata.thumbnail,
					duration: project.metadata.duration,
					createdAt: project.metadata.createdAt.toISOString(),
					updatedAt: project.metadata.updatedAt.toISOString(),
				},
				scenes: serializedScenes,
				currentSceneId: project.currentSceneId,
				settings: project.settings,
				version: project.version,
				timelineViewState: project.timelineViewState,
			};

			const mediaAssets = await storageService.loadAllMediaAssets({
				projectId: project.metadata.id,
			});
			const mediaManifest: ExportedMediaManifestEntry[] = mediaAssets.map(
				(asset) => ({
					mediaId: asset.id,
					filename: asset.name,
					type: asset.type,
					size: asset.file.size,
					width: asset.width,
					height: asset.height,
					duration: asset.duration,
				}),
			);

			const exported: ExportedProjectJSON = {
				schema_version: EXPORT_SCHEMA_VERSION,
				exported_at: new Date().toISOString(),
				project: serializedProject,
				media: mediaManifest,
			};

			const json = JSON.stringify(exported, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `${project.metadata.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.opencut.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Project exported successfully");
		} catch (error) {
			console.error("Failed to export project:", error);
			toast.error("Failed to export project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	}

	/**
	 * Exports any project (by ID) as a JSON file and triggers a browser download.
	 *
	 * Unlike {@link exportProjectAsJSON}, this does not require the project to be
	 * active. It loads the project data directly from storage.
	 */
	async exportProjectByIdAsJSON({ id }: { id: string }): Promise<void> {
		try {
			const result = await storageService.loadProject({ id });
			if (!result) {
				toast.error("Project not found");
				return;
			}

			const project = result.project;

			const serializedScenes = project.scenes.map((scene) => ({
				id: scene.id,
				name: scene.name,
				isMain: scene.isMain,
				tracks: scene.tracks,
				bookmarks: scene.bookmarks,
				createdAt: scene.createdAt.toISOString(),
				updatedAt: scene.updatedAt.toISOString(),
			}));

			const serializedProject: SerializedProject = {
				metadata: {
					id: project.metadata.id,
					name: project.metadata.name,
					thumbnail: project.metadata.thumbnail,
					duration: project.metadata.duration,
					createdAt: project.metadata.createdAt.toISOString(),
					updatedAt: project.metadata.updatedAt.toISOString(),
				},
				scenes: serializedScenes,
				currentSceneId: project.currentSceneId,
				settings: project.settings,
				version: project.version,
				timelineViewState: project.timelineViewState,
			};

			const mediaAssets = await storageService.loadAllMediaAssets({
				projectId: id,
			});
			const mediaManifest: ExportedMediaManifestEntry[] = mediaAssets.map(
				(asset) => ({
					mediaId: asset.id,
					filename: asset.name,
					type: asset.type,
					size: asset.file.size,
					width: asset.width,
					height: asset.height,
					duration: asset.duration,
				}),
			);

			const exported: ExportedProjectJSON = {
				schema_version: EXPORT_SCHEMA_VERSION,
				exported_at: new Date().toISOString(),
				project: serializedProject,
				media: mediaManifest,
			};

			const json = JSON.stringify(exported, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);

			const a = document.createElement("a");
			a.href = url;
			a.download = `${project.metadata.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.opencut.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success("Project exported successfully");
		} catch (error) {
			console.error("Failed to export project:", error);
			toast.error("Failed to export project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		}
	}

	/**
	 * Imports a project from a JSON string previously created by {@link exportProjectAsJSON}.
	 *
	 * A new project is created with a fresh ID and timestamps. The timeline
	 * structure (scenes, tracks, elements) is fully restored. Media files are
	 * **not** included in the export, so elements that reference media assets
	 * will need their media re-imported by the user.
	 *
	 * @returns The new project ID, or `null` if the import failed.
	 */
	async importProjectFromJSON({
		json,
	}: {
		json: string;
	}): Promise<string | null> {
		try {
			const parsed = JSON.parse(json) as ExportedProjectJSON;

			if (
				!parsed.project ||
				!parsed.project.metadata ||
				!parsed.project.scenes ||
				parsed.project.scenes.length === 0
			) {
				toast.error("Invalid project file", {
					description: "The file does not contain a valid OpenCut project.",
				});
				return null;
			}

			if (parsed.schema_version !== EXPORT_SCHEMA_VERSION) {
				toast.error("Incompatible project file", {
					description: `Unsupported schema version ${parsed.schema_version}, expected ${EXPORT_SCHEMA_VERSION}.`,
				});
				return null;
			}

			const imported = parsed.project;

			const newProjectId = generateUUID();
			const now = new Date();

			const scenes = imported.scenes.map((scene) => ({
				id: scene.id,
				name: scene.name,
				isMain: scene.isMain,
				tracks: scene.tracks,
				bookmarks: scene.bookmarks ?? [],
				createdAt: now,
				updatedAt: now,
			}));

			const newProject: TProject = {
				metadata: {
					id: newProjectId,
					name: imported.metadata.name,
					duration:
						imported.metadata.duration ??
						getProjectDurationFromScenes({ scenes }),
					createdAt: now,
					updatedAt: now,
				},
				scenes,
				currentSceneId: imported.currentSceneId || scenes[0]?.id || "",
				settings: imported.settings,
				version: CURRENT_PROJECT_VERSION,
				timelineViewState: imported.timelineViewState,
			};

			await storageService.saveProject({ project: newProject });
			this.updateMetadata(newProject);

			const mediaCount = parsed.media?.length ?? 0;
			if (mediaCount > 0) {
				toast.success("Project imported", {
					description: `${mediaCount} media file(s) need to be re-imported.`,
				});
			} else {
				toast.success("Project imported successfully");
			}

			return newProjectId;
		} catch (error) {
			console.error("Failed to import project:", error);
			toast.error("Failed to import project", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
			return null;
		}
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private async updateThumbnailFromTimeline(): Promise<boolean> {
		if (!this.active) return false;

		const tracks = this.editor.scenes.getActiveScene().tracks;
		const mediaAssets = this.editor.media.getAssets();
		const duration = this.editor.timeline.getTotalDuration();
		const { canvasSize, background } = this.active.settings;

		const scene = buildScene({
			tracks,
			mediaAssets,
			duration: duration || 1,
			canvasSize,
			background,
		});

		const renderer = new CanvasRenderer({
			width: canvasSize.width,
			height: canvasSize.height,
			fps: this.active.settings.fps,
		});

		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = canvasSize.width;
		tempCanvas.height = canvasSize.height;

		await renderer.renderToCanvas({
			node: scene,
			time: 0,
			targetCanvas: tempCanvas,
		});

		const thumbnailDataUrl = tempCanvas.toDataURL("image/png");

		await this.updateThumbnail({ thumbnail: thumbnailDataUrl });
		return true;
	}

	private updateMetadata(project: TProject): void {
		const index = this.savedProjects.findIndex(
			(p) => p.id === project.metadata.id,
		);

		if (index !== -1) {
			this.savedProjects = this.savedProjects.with(index, project.metadata);
		} else {
			this.savedProjects = [project.metadata, ...this.savedProjects];
		}

		this.notify();
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}
}
