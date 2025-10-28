import { TProject, BlurIntensity, Scene } from "@/types/project";
import { create } from "zustand";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { useSceneStore } from "./scene-store";
import { generateUUID } from "@/lib/utils";
import { CanvasSize, CanvasMode } from "@/types/editor";

export const DEFAULT_CANVAS_SIZE: CanvasSize = { width: 1920, height: 1080 };
export const DEFAULT_FPS = 30;

export function createMainScene(): Scene {
  return {
    id: generateUUID(),
    name: "Main Scene",
    isMain: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const createDefaultProject = (name: string): TProject => {
  const mainScene = createMainScene();

  return {
    id: generateUUID(),
    name,
    thumbnail: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    scenes: [mainScene],
    currentSceneId: mainScene.id,
    backgroundColor: "#000000",
    backgroundType: "color",
    blurIntensity: 8,
    bookmarks: [],
    fps: DEFAULT_FPS,
    canvasSize: DEFAULT_CANVAS_SIZE,
    canvasMode: "preset",
  };
};

interface ProjectStore {
  activeProject: TProject | null;
  savedProjects: TProject[];
  isLoading: boolean;
  isInitialized: boolean;
  invalidProjectIds?: Set<string>;

  // Actions
  createNewProject: (name: string) => Promise<string>;
  loadProject: (id: string) => Promise<void>;
  saveCurrentProject: () => Promise<void>;
  loadAllProjects: () => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  closeProject: () => void;
  renameProject: (projectId: string, name: string) => Promise<void>;
  duplicateProject: (projectId: string) => Promise<string>;
  updateProjectBackground: (backgroundColor: string) => Promise<void>;
  updateBackgroundType: (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: BlurIntensity }
  ) => Promise<void>;
  updateProjectFps: (fps: number) => Promise<void>;
  updateCanvasSize: (size: CanvasSize, mode: CanvasMode) => Promise<void>;

  // Bookmark methods
  toggleBookmark: (time: number) => Promise<void>;
  isBookmarked: (time: number) => boolean;
  removeBookmark: (time: number) => Promise<void>;

  getFilteredAndSortedProjects: (
    searchQuery: string,
    sortOption: string
  ) => TProject[];

  // Global invalid project ID tracking
  isInvalidProjectId: (id: string) => boolean;
  markProjectIdAsInvalid: (id: string) => void;
  clearInvalidProjectIds: () => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  activeProject: null,
  savedProjects: [],
  isLoading: true,
  isInitialized: false,
  invalidProjectIds: new Set<string>(),

  // Implementation of bookmark methods
  toggleBookmark: async (time: number) => {
    const { activeProject } = get();
    if (!activeProject) return;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    const bookmarks = activeProject.bookmarks || [];
    let updatedBookmarks: number[];

    // Check if already bookmarked
    const bookmarkIndex = bookmarks.findIndex(
      (bookmark) => Math.abs(bookmark - frameTime) < 0.001
    );

    if (bookmarkIndex !== -1) {
      // Remove bookmark
      updatedBookmarks = bookmarks.filter((_, i) => i !== bookmarkIndex);
    } else {
      // Add bookmark
      updatedBookmarks = [...bookmarks, frameTime].sort((a, b) => a - b);
    }

    const updatedProject = {
      ...activeProject,
      bookmarks: updatedBookmarks,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to update project bookmarks:", error);
      toast.error("Failed to update bookmarks", {
        description: "Please try again",
      });
    }
  },

  isBookmarked: (time: number) => {
    const { activeProject } = get();
    if (!activeProject || !activeProject.bookmarks) return false;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    return activeProject.bookmarks.some(
      (bookmark) => Math.abs(bookmark - frameTime) < 0.001
    );
  },

  removeBookmark: async (time: number) => {
    const { activeProject } = get();
    if (!activeProject || !activeProject.bookmarks) return;

    // Round time to the nearest frame
    const fps = activeProject.fps || DEFAULT_FPS;
    const frameTime = Math.round(time * fps) / fps;

    const updatedBookmarks = activeProject.bookmarks.filter(
      (bookmark) => Math.abs(bookmark - frameTime) >= 0.001
    );

    if (updatedBookmarks.length === activeProject.bookmarks.length) {
      // No bookmark found to remove
      return;
    }

    const updatedProject = {
      ...activeProject,
      bookmarks: updatedBookmarks,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to update project bookmarks:", error);
      toast.error("Failed to remove bookmark", {
        description: "Please try again",
      });
    }
  },

  createNewProject: async (name: string) => {
    const newProject = createDefaultProject(name);

    set({ activeProject: newProject });

    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();

    sceneStore.initializeScenes({
      scenes: newProject.scenes,
      currentSceneId: newProject.currentSceneId,
    });

    try {
      await storageService.saveProject({ project: newProject });
      // Reload all projects to update the list
      await get().loadAllProjects();
      return newProject.id;
    } catch (error) {
      toast.error("Failed to save new project");
      throw error;
    }
  },

  loadProject: async (id: string) => {
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    // Prevent flicker when switching projects - clear all stores
    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();
    sceneStore.clearScenes();

    try {
      const project = await storageService.loadProject({ id });
      if (project) {
        set({ activeProject: project });

        let currentScene = null;
        if (project.scenes && project.scenes.length > 0) {
          sceneStore.initializeScenes({
            scenes: project.scenes,
            currentSceneId: project.currentSceneId,
          });
          // Get current scene directly from project data (don't rely on store state)
          currentScene =
            project.scenes.find((s) => s.id === project.currentSceneId) ||
            project.scenes.find((s) => s.isMain) ||
            project.scenes[0];
        }

        await Promise.all([
          mediaStore.loadProjectMedia(id),
          timelineStore.loadProjectTimeline({
            projectId: id,
            sceneId: currentScene?.id,
          }),
        ]);
      } else {
        throw new Error(`Project with id ${id} not found`);
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      throw error; // Re-throw so the editor page can handle it
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentProject: async () => {
    const { activeProject } = get();
    if (!activeProject) return;

    try {
      const timelineStore = useTimelineStore.getState();
      const sceneStore = useSceneStore.getState();
      const currentScene = sceneStore.currentScene;

      await Promise.all([
        storageService.saveProject({ project: activeProject }),
        timelineStore.saveProjectTimeline({
          projectId: activeProject.id,
          sceneId: currentScene?.id,
        }),
      ]);
      await get().loadAllProjects(); // Refresh the list
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  },

  loadAllProjects: async () => {
    if (!get().isInitialized) {
      set({ isLoading: true });
    }

    try {
      const projects = await storageService.loadAllProjects();
      set({ savedProjects: projects });
    } catch (error) {
      console.error("Failed to load projects:", error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }
  },

  deleteProject: async (id: string) => {
    try {
      await Promise.all([
        storageService.deleteProjectMedia({ projectId: id }),
        storageService.deleteProjectTimeline({ projectId: id }),
        storageService.deleteProject({ id }),
      ]);
      await get().loadAllProjects(); // Refresh the list

      // If deleted active project, close it and clear data
      const { activeProject } = get();
      if (activeProject?.id === id) {
        set({ activeProject: null });
        const mediaStore = useMediaStore.getState();
        const timelineStore = useTimelineStore.getState();
        const sceneStore = useSceneStore.getState();

        mediaStore.clearAllMedia();
        timelineStore.clearTimeline();
        sceneStore.clearScenes();
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  },

  closeProject: () => {
    set({ activeProject: null });

    const mediaStore = useMediaStore.getState();
    const timelineStore = useTimelineStore.getState();
    const sceneStore = useSceneStore.getState();

    mediaStore.clearAllMedia();
    timelineStore.clearTimeline();
    sceneStore.clearScenes();
  },

  renameProject: async (id: string, name: string) => {
    const { savedProjects } = get();

    // Find the project to rename
    const projectToRename = savedProjects.find((p) => p.id === id);
    if (!projectToRename) {
      toast.error("Project not found", {
        description: "Please try again",
      });
      return;
    }

    const updatedProject = {
      ...projectToRename,
      name,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });

      await get().loadAllProjects();

      // Update activeProject if same project
      const { activeProject } = get();
      if (activeProject?.id === id) {
        set({ activeProject: updatedProject });
      }
    } catch (error) {
      console.error("Failed to rename project:", error);
      toast.error("Failed to rename project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  },

  duplicateProject: async (projectId: string) => {
    try {
      const project = await storageService.loadProject({ id: projectId });
      if (!project) {
        toast.error("Project not found", {
          description: "Please try again",
        });
        throw new Error("Project not found");
      }

      const { savedProjects } = get();

      // Extract the base name (remove any existing numbering)
      const numberMatch = project.name.match(/^\((\d+)\)\s+(.+)$/);
      const baseName = numberMatch ? numberMatch[2] : project.name;
      const existingNumbers: number[] = [];

      // Check for pattern "(number) baseName" in existing projects
      savedProjects.forEach((p) => {
        const match = p.name.match(/^\((\d+)\)\s+(.+)$/);
        if (match && match[2] === baseName) {
          existingNumbers.push(parseInt(match[1], 10));
        }
      });

      const nextNumber =
        existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

      const newProject: TProject = {
        ...project,
        id: generateUUID(),
        name: `(${nextNumber}) ${baseName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await storageService.saveProject({ project: newProject });
      await get().loadAllProjects();
      return newProject.id;
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      toast.error("Failed to duplicate project", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
      throw error;
    }
  },

  updateProjectBackground: async (backgroundColor: string) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundColor,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects();
    } catch (error) {
      console.error("Failed to update project background:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateBackgroundType: async (
    type: "color" | "blur",
    options?: { backgroundColor?: string; blurIntensity?: BlurIntensity }
  ) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      backgroundType: type,
      ...(options?.backgroundColor && {
        backgroundColor: options.backgroundColor,
      }),
      ...(options?.blurIntensity !== undefined && {
        blurIntensity: options.blurIntensity,
      }),
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects();
    } catch (error) {
      console.error("Failed to update background type:", error);
      toast.error("Failed to update background", {
        description: "Please try again",
      });
    }
  },

  updateProjectFps: async (fps: number) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      fps,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects();
    } catch (error) {
      console.error("Failed to update project FPS:", error);
      toast.error("Failed to update project FPS", {
        description: "Please try again",
      });
    }
  },

  updateCanvasSize: async (size: CanvasSize, mode: CanvasMode) => {
    const { activeProject } = get();
    if (!activeProject) return;

    const updatedProject = {
      ...activeProject,
      canvasSize: size,
      canvasMode: mode,
      updatedAt: new Date(),
    };

    try {
      await storageService.saveProject({ project: updatedProject });
      set({ activeProject: updatedProject });
      await get().loadAllProjects();
    } catch (error) {
      console.error("Failed to update canvas size:", error);
      toast.error("Failed to update canvas size", {
        description: "Please try again",
      });
    }
  },

  getFilteredAndSortedProjects: (searchQuery: string, sortOption: string) => {
    const { savedProjects } = get();

    const filteredProjects = savedProjects.filter((project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedProjects = [...filteredProjects].sort((a, b) => {
      const [key, order] = sortOption.split("-");

      if (key !== "createdAt" && key !== "name") {
        console.warn(`Invalid sort key: ${key}`);
        return 0;
      }

      const aValue = a[key];
      const bValue = b[key];

      if (aValue === undefined || bValue === undefined) return 0;

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
  },

  // Global invalid project ID tracking
  isInvalidProjectId: (id: string) => {
    const invalidIds = get().invalidProjectIds || new Set();
    return invalidIds.has(id);
  },

  markProjectIdAsInvalid: (id: string) => {
    set((state) => ({
      invalidProjectIds: new Set([
        ...(state.invalidProjectIds || new Set()),
        id,
      ]),
    }));
  },

  clearInvalidProjectIds: () => {
    set({ invalidProjectIds: new Set() });
  },
}));
