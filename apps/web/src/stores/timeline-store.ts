import { create } from "zustand";
import {
  TrackType,
  TimelineElement,
  CreateTimelineElement,
  TimelineTrack,
  TextElement,
  DragData,
  MediaElement,
  sortTracksByOrder,
  ensureMainTrack,
  validateElementTrackCompatibility,
} from "@/types/timeline";
import { useMediaStore, getMediaAspectRatio } from "./media-store";
import { MediaFile, MediaType } from "@/types/media";
import { findBestCanvasPreset } from "@/lib/editor-utils";
import { storageService } from "@/lib/storage/storage-service";
import { useProjectStore } from "./project-store";
import { useSceneStore } from "./scene-store";
import { generateUUID } from "@/lib/utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { checkElementOverlaps, resolveElementOverlaps } from "@/lib/timeline";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { usePlaybackStore } from "./playback-store";

// Helper function to manage element naming with suffixes
const getElementNameWithSuffix = (
  originalName: string,
  suffix: string
): string => {
  // Remove existing suffixes to prevent accumulation
  const baseName = originalName
    .replace(/ \(left\)$/i, "")
    .replace(/ \(right\)$/i, "")
    .replace(/ \(audio\)$/i, "")
    .replace(/ \(split \d+\)$/i, "");

  return `${baseName} (${suffix})`;
};

interface TimelineStore {
  // Private track storage
  _tracks: TimelineTrack[];
  history: TimelineTrack[][];
  redoStack: TimelineTrack[][];

  // Clipboard buffer
  clipboard: {
    items: Array<{ trackType: TrackType; element: CreateTimelineElement }>;
  } | null;

  // Always returns properly ordered tracks with main track ensured
  tracks: TimelineTrack[];

  // Manual method if you need to force recomputation
  getSortedTracks: () => TimelineTrack[];

  // Snapping settings
  snappingEnabled: boolean;

  // Snapping actions
  toggleSnapping: () => void;

  // Ripple editing mode
  rippleEditingEnabled: boolean;
  toggleRippleEditing: () => void;

  // Multi-selection
  selectedElements: { trackId: string; elementId: string }[];
  selectElement: (trackId: string, elementId: string, multi?: boolean) => void;
  deselectElement: (trackId: string, elementId: string) => void;
  clearSelectedElements: () => void;
  setSelectedElements: (
    elements: { trackId: string; elementId: string }[]
  ) => void;

  // Drag state
  dragState: {
    isDragging: boolean;
    elementId: string | null;
    trackId: string | null;
    startMouseX: number;
    startElementTime: number;
    clickOffsetTime: number;
    currentTime: number;
  };
  setDragState: (dragState: Partial<TimelineStore["dragState"]>) => void;
  startDrag: (
    elementId: string,
    trackId: string,
    startMouseX: number,
    startElementTime: number,
    clickOffsetTime: number
  ) => void;
  updateDragTime: (currentTime: number) => void;
  endDrag: () => void;

  // Actions
  addTrack: (type: TrackType) => string;
  insertTrackAt: (type: TrackType, index: number) => string;
  removeTrack: (trackId: string) => void;
  removeTrackWithRipple: (trackId: string) => void;
  addElementToTrack: (trackId: string, element: CreateTimelineElement) => void;

  moveElementToTrack: (
    fromTrackId: string,
    toTrackId: string,
    elementId: string
  ) => void;
  updateElementTrim: (
    trackId: string,
    elementId: string,
    trimStart: number,
    trimEnd: number,
    pushHistory?: boolean
  ) => void;
  updateElementDuration: (
    trackId: string,
    elementId: string,
    duration: number,
    pushHistory?: boolean
  ) => void;
  updateElementStartTime: (
    trackId: string,
    elementId: string,
    startTime: number,
    pushHistory?: boolean
  ) => void;
  toggleTrackMute: (trackId: string) => void;
  splitAndKeepLeft: (
    trackId: string,
    elementId: string,
    splitTime: number
  ) => void;
  splitAndKeepRight: (
    trackId: string,
    elementId: string,
    splitTime: number
  ) => void;
  separateAudio: (trackId: string, elementId: string) => string | null;

  // Replace media for an element
  replaceElementMedia: (
    trackId: string,
    elementId: string,
    newFile: File
  ) => Promise<{ success: boolean; error?: string }>;

  // Ripple editing functions
  updateElementStartTimeWithRipple: (
    trackId: string,
    elementId: string,
    newStartTime: number
  ) => void;
  removeElementFromTrackWithRipple: (
    trackId: string,
    elementId: string,
    pushHistory?: boolean
  ) => void;

  // Computed values
  getTotalDuration: () => number;
  getProjectThumbnail: (projectId: string) => Promise<string | null>;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Persistence actions
  loadProjectTimeline: ({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }) => Promise<void>;
  saveProjectTimeline: ({
    projectId,
    sceneId,
  }: {
    projectId: string;
    sceneId?: string;
  }) => Promise<void>;
  clearTimeline: () => void;

  // Clipboard actions
  copySelected: () => void;
  pasteAtTime: (time: number) => void;

  // Unified selection-aware actions
  deleteSelected: (trackId?: string, elementId?: string) => void;
  splitSelected: (
    splitTime: number,
    trackId?: string,
    elementId?: string
  ) => void;
  toggleSelectedHidden: (trackId?: string, elementId?: string) => void;
  toggleSelectedMuted: (trackId?: string, elementId?: string) => void;
  duplicateElement: (trackId: string, elementId: string) => void;
  revealElementInMedia: (elementId: string) => void;
  replaceElementWithFile: (
    trackId: string,
    elementId: string,
    file: File
  ) => Promise<void>;
  getContextMenuState: (
    trackId: string,
    elementId: string
  ) => {
    isMultipleSelected: boolean;
    isCurrentElementSelected: boolean;
    hasAudioElements: boolean;
    canSplitSelected: boolean;
    currentTime: number;
  };
  updateTextElement: (
    trackId: string,
    elementId: string,
    updates: Partial<
      Pick<
        TextElement,
        | "content"
        | "fontSize"
        | "fontFamily"
        | "color"
        | "backgroundColor"
        | "textAlign"
        | "fontWeight"
        | "fontStyle"
        | "textDecoration"
        | "x"
        | "y"
        | "rotation"
        | "opacity"
      >
    >
  ) => void;
  checkElementOverlap: (
    trackId: string,
    startTime: number,
    duration: number,
    excludeElementId?: string
  ) => boolean;
  findOrCreateTrack: (trackType: TrackType) => string;
  addElementAtTime: (
    item: MediaFile | TextElement,
    currentTime?: number
  ) => boolean;
  addElementToNewTrack: (item: MediaFile | TextElement | DragData) => boolean;
}

export const useTimelineStore = create<TimelineStore>((set, get) => {
  // Helper to update tracks and maintain ordering
  const updateTracks = (newTracks: TimelineTrack[]) => {
    const tracksWithMain = ensureMainTrack(newTracks);
    const sortedTracks = sortTracksByOrder(tracksWithMain);
    set({
      _tracks: tracksWithMain,
      tracks: sortedTracks,
    });
  };

  // Helper to auto-save timeline changes
  const autoSaveTimeline = async () => {
    const activeProject = useProjectStore.getState().activeProject;
    const currentScene = useSceneStore.getState().currentScene;

    if (activeProject && currentScene) {
      try {
        await storageService.saveTimeline({
          projectId: activeProject.id,
          tracks: get()._tracks,
          sceneId: currentScene.id,
        });
      } catch (error) {
        console.error("Failed to auto-save timeline:", error);
      }
    } else {
      console.warn(
        "Auto-save skipped - missing activeProject or currentScene:",
        {
          hasProject: !!activeProject,
          hasScene: !!currentScene,
          sceneName: currentScene?.name,
        }
      );
    }
  };

  // Helper to update tracks and auto-save
  const updateTracksAndSave = (newTracks: TimelineTrack[]) => {
    updateTracks(newTracks);
    // Auto-save in background
    setTimeout(autoSaveTimeline, 100);
  };

  // Initialize with proper track ordering
  const initialTracks = ensureMainTrack([]);
  const sortedInitialTracks = sortTracksByOrder(initialTracks);

  return {
    _tracks: initialTracks,
    tracks: sortedInitialTracks,
    history: [],
    redoStack: [],
    selectedElements: [],
    rippleEditingEnabled: false,
    clipboard: null,

    // Snapping settings defaults
    snappingEnabled: true,

    getSortedTracks: () => {
      const { _tracks } = get();
      const tracksWithMain = ensureMainTrack(_tracks);
      return sortTracksByOrder(tracksWithMain);
    },

    pushHistory: () => {
      const { _tracks, history } = get();
      set({
        history: [...history, JSON.parse(JSON.stringify(_tracks))],
        redoStack: [],
      });
    },

    undo: () => {
      const { history, redoStack, _tracks } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      updateTracksAndSave(prev);
      set({
        history: history.slice(0, -1),
        redoStack: [...redoStack, JSON.parse(JSON.stringify(_tracks))],
      });
    },

    selectElement: (trackId, elementId, multi = false) => {
      set((state) => {
        const exists = state.selectedElements.some(
          (c) => c.trackId === trackId && c.elementId === elementId
        );
        if (multi) {
          return exists
            ? {
                selectedElements: state.selectedElements.filter(
                  (c) => !(c.trackId === trackId && c.elementId === elementId)
                ),
              }
            : {
                selectedElements: [
                  ...state.selectedElements,
                  { trackId, elementId },
                ],
              };
        }
        return { selectedElements: [{ trackId, elementId }] };
      });
    },

    deselectElement: (trackId, elementId) => {
      set((state) => ({
        selectedElements: state.selectedElements.filter(
          (c) => !(c.trackId === trackId && c.elementId === elementId)
        ),
      }));
    },

    clearSelectedElements: () => {
      set({ selectedElements: [] });
    },

    setSelectedElements: (elements) => set({ selectedElements: elements }),

    addTrack: (type) => {
      get().pushHistory();

      const trackName =
        type === "media"
          ? "Media Track"
          : type === "text"
            ? "Text Track"
            : type === "audio"
              ? "Audio Track"
              : "Track";

      const newTrack: TimelineTrack = {
        id: generateUUID(),
        name: trackName,
        type,
        elements: [],
        muted: false,
      };

      updateTracksAndSave([...get()._tracks, newTrack]);
      return newTrack.id;
    },

    insertTrackAt: (type, index) => {
      get().pushHistory();

      const trackName =
        type === "media"
          ? "Media Track"
          : type === "text"
            ? "Text Track"
            : type === "audio"
              ? "Audio Track"
              : "Track";

      const newTrack: TimelineTrack = {
        id: generateUUID(),
        name: trackName,
        type,
        elements: [],
        muted: false,
      };

      const newTracks = [...get()._tracks];
      newTracks.splice(index, 0, newTrack);
      updateTracksAndSave(newTracks);
      return newTrack.id;
    },

    removeTrack: (trackId) => {
      const { rippleEditingEnabled } = get();

      if (rippleEditingEnabled) {
        get().removeTrackWithRipple(trackId);
      } else {
        get().pushHistory();
        updateTracksAndSave(
          get()._tracks.filter((track) => track.id !== trackId)
        );
      }
    },

    removeTrackWithRipple: (trackId) => {
      const { _tracks } = get();
      const trackToRemove = _tracks.find((t) => t.id === trackId);

      if (!trackToRemove) return;

      get().pushHistory();

      const occupiedRanges = trackToRemove.elements.map((element) => ({
        startTime: element.startTime,
        endTime:
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd),
      }));

      occupiedRanges.sort((a, b) => a.startTime - b.startTime);

      const mergedRanges: Array<{
        startTime: number;
        endTime: number;
        duration: number;
      }> = [];

      for (const range of occupiedRanges) {
        if (mergedRanges.length === 0) {
          mergedRanges.push({
            startTime: range.startTime,
            endTime: range.endTime,
            duration: range.endTime - range.startTime,
          });
        } else {
          const lastRange = mergedRanges[mergedRanges.length - 1];
          if (range.startTime <= lastRange.endTime) {
            lastRange.endTime = Math.max(lastRange.endTime, range.endTime);
            lastRange.duration = lastRange.endTime - lastRange.startTime;
          } else {
            mergedRanges.push({
              startTime: range.startTime,
              endTime: range.endTime,
              duration: range.endTime - range.startTime,
            });
          }
        }
      }

      const updatedTracks = _tracks
        .filter((track) => track.id !== trackId)
        .map((track) => {
          const updatedElements = track.elements.map((element) => {
            let newStartTime = element.startTime;

            for (let i = mergedRanges.length - 1; i >= 0; i--) {
              const gap = mergedRanges[i];
              if (newStartTime >= gap.endTime) {
                newStartTime -= gap.duration;
              }
            }

            return {
              ...element,
              startTime: Math.max(0, newStartTime),
            };
          });

          const hasOverlaps = checkElementOverlaps(updatedElements);
          if (hasOverlaps) {
            const resolvedElements = resolveElementOverlaps(updatedElements);
            return { ...track, elements: resolvedElements };
          }

          return { ...track, elements: updatedElements };
        });

      updateTracksAndSave(updatedTracks);
    },

    addElementToTrack: (trackId, elementData) => {
      get().pushHistory();

      const track = get()._tracks.find((t) => t.id === trackId);
      if (!track) {
        console.error("Track not found:", trackId);
        return;
      }

      const validation = validateElementTrackCompatibility(elementData, track);
      if (!validation.isValid) {
        console.error(validation.errorMessage);
        return;
      }

      if (elementData.type === "media" && !elementData.mediaId) {
        console.error("Media element must have mediaId");
        return;
      }

      if (elementData.type === "text" && !elementData.content) {
        console.error("Text element must have content");
        return;
      }

      const currentState = get();
      const totalElementsInTimeline = currentState._tracks.reduce(
        (total, track) => total + track.elements.length,
        0
      );
      const isFirstElement = totalElementsInTimeline === 0;

      const newElement: TimelineElement = {
        ...elementData,
        id: generateUUID(),
        startTime: elementData.startTime,
        trimStart: elementData.trimStart ?? 0,
        trimEnd: elementData.trimEnd ?? 0,
        ...(elementData.type === "media"
          ? { muted: elementData.muted ?? false }
          : {}),
      } as TimelineElement;

      if (isFirstElement && newElement.type === "media") {
        const mediaStore = useMediaStore.getState();
        const mediaItem = mediaStore.mediaFiles.find(
          (item) => item.id === newElement.mediaId
        );

        if (
          mediaItem &&
          (mediaItem.type === "image" || mediaItem.type === "video")
        ) {
          const projectStore = useProjectStore.getState();
          projectStore.updateCanvasSize(
            findBestCanvasPreset(getMediaAspectRatio(mediaItem)),
            "original"
          );
        }

        if (mediaItem && mediaItem.type === "video" && mediaItem.fps) {
          const projectStore = useProjectStore.getState();
          if (projectStore.activeProject) {
            projectStore.updateProjectFps(mediaItem.fps);
          }
        }
      }

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? { ...track, elements: [...track.elements, newElement] }
            : track
        )
      );

      get().selectElement(trackId, newElement.id);
    },

    removeElementFromTrackWithRipple: (
      trackId,
      elementId,
      pushHistory = true
    ) => {
      const { _tracks, rippleEditingEnabled } = get();

      if (!rippleEditingEnabled) {
        // Inline non-ripple removal logic
        if (pushHistory) get().pushHistory();
        updateTracksAndSave(
          _tracks
            .map((track) =>
              track.id === trackId
                ? {
                    ...track,
                    elements: track.elements.filter(
                      (element) => element.id !== elementId
                    ),
                  }
                : track
            )
            .filter((track) => track.elements.length > 0)
        );
        return;
      }

      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);

      if (!element || !track) return;

      if (pushHistory) get().pushHistory();

      const elementStartTime = element.startTime;
      const elementDuration =
        element.duration - element.trimStart - element.trimEnd;
      const elementEndTime = elementStartTime + elementDuration;

      const updatedTracks = _tracks
        .map((currentTrack) => {
          const shouldApplyRipple = currentTrack.id === trackId;

          const updatedElements = currentTrack.elements
            .filter((currentElement) => {
              if (
                currentElement.id === elementId &&
                currentTrack.id === trackId
              ) {
                return false;
              }
              return true;
            })
            .map((currentElement) => {
              if (!shouldApplyRipple) {
                return currentElement;
              }

              if (currentElement.startTime >= elementEndTime) {
                return {
                  ...currentElement,
                  startTime: Math.max(
                    0,
                    currentElement.startTime - elementDuration
                  ),
                };
              }
              return currentElement;
            });

          const hasOverlaps = checkElementOverlaps(updatedElements);
          if (hasOverlaps) {
            const resolvedElements = resolveElementOverlaps(updatedElements);
            return { ...currentTrack, elements: resolvedElements };
          }

          return { ...currentTrack, elements: updatedElements };
        })
        .filter((track) => track.elements.length > 0 || track.isMain);

      updateTracksAndSave(updatedTracks);
    },

    moveElementToTrack: (fromTrackId, toTrackId, elementId) => {
      get().pushHistory();

      const fromTrack = get()._tracks.find((track) => track.id === fromTrackId);
      const toTrack = get()._tracks.find((track) => track.id === toTrackId);
      const elementToMove = fromTrack?.elements.find(
        (element) => element.id === elementId
      );

      if (!elementToMove || !toTrack) return;

      const validation = validateElementTrackCompatibility(
        elementToMove,
        toTrack
      );
      if (!validation.isValid) {
        console.error(validation.errorMessage);
        return;
      }

      const newTracks = get()
        ._tracks.map((track) => {
          if (track.id === fromTrackId) {
            return {
              ...track,
              elements: track.elements.filter(
                (element) => element.id !== elementId
              ),
            };
          }
          if (track.id === toTrackId) {
            return {
              ...track,
              elements: [...track.elements, elementToMove],
            };
          }
          return track;
        })
        .filter((track) => track.elements.length > 0);

      updateTracksAndSave(newTracks);
    },

    updateElementTrim: (
      trackId,
      elementId,
      trimStart,
      trimEnd,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, trimStart, trimEnd }
                    : element
                ),
              }
            : track
        )
      );
    },

    updateElementDuration: (
      trackId,
      elementId,
      duration,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId ? { ...element, duration } : element
                ),
              }
            : track
        )
      );
    },

    updateElementStartTime: (
      trackId,
      elementId,
      startTime,
      pushHistory = true
    ) => {
      if (pushHistory) get().pushHistory();
      const clampedStartTime = Math.max(0, startTime);
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId
                    ? { ...element, startTime: clampedStartTime }
                    : element
                ),
              }
            : track
        )
      );
    },

    updateElementStartTimeWithRipple: (trackId, elementId, newStartTime) => {
      const { _tracks, rippleEditingEnabled } = get();

      if (!rippleEditingEnabled) {
        get().updateElementStartTime(trackId, elementId, newStartTime);
        return;
      }

      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);

      if (!element || !track) return;

      get().pushHistory();

      const oldStartTime = element.startTime;
      const oldEndTime =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);
      const newEndTime =
        newStartTime + (element.duration - element.trimStart - element.trimEnd);
      const timeDelta = newStartTime - oldStartTime;

      const updatedTracks = _tracks.map((currentTrack) => {
        const shouldApplyRipple = currentTrack.id === trackId;

        const updatedElements = currentTrack.elements.map((currentElement) => {
          if (currentElement.id === elementId && currentTrack.id === trackId) {
            return { ...currentElement, startTime: Math.max(0, newStartTime) };
          }

          if (!shouldApplyRipple) {
            return currentElement;
          }

          const currentElementStart = currentElement.startTime;
          const currentElementEnd =
            currentElement.startTime +
            (currentElement.duration -
              currentElement.trimStart -
              currentElement.trimEnd);

          if (timeDelta > 0) {
            if (currentElementStart >= oldEndTime) {
              return {
                ...currentElement,
                startTime: currentElementStart + timeDelta,
              };
            }
          } else if (timeDelta < 0) {
            if (
              currentElementStart >= newEndTime &&
              currentElementStart >= oldStartTime
            ) {
              return {
                ...currentElement,
                startTime: Math.max(0, currentElementStart + timeDelta),
              };
            }
          }

          return currentElement;
        });

        const hasOverlaps = checkElementOverlaps(updatedElements);
        if (hasOverlaps) {
          const resolvedElements = resolveElementOverlaps(updatedElements);
          return { ...currentTrack, elements: resolvedElements };
        }

        return { ...currentTrack, elements: updatedElements };
      });

      updateTracksAndSave(updatedTracks);
    },

    toggleTrackMute: (trackId) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId ? { ...track, muted: !track.muted } : track
        )
      );
    },

    updateTextElement: (trackId, elementId, updates) => {
      get().pushHistory();
      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((element) =>
                  element.id === elementId && element.type === "text"
                    ? { ...element, ...updates }
                    : element
                ),
              }
            : track
        )
      );
    },

    // Split element and keep only the left portion
    splitAndKeepLeft: (trackId, elementId, splitTime) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) return;

      const effectiveStart = element.startTime;
      const effectiveEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);

      if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

      get().pushHistory();

      const relativeTime = splitTime - element.startTime;
      const durationToRemove =
        element.duration - element.trimStart - element.trimEnd - relativeTime;

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((c) =>
                  c.id === elementId
                    ? {
                        ...c,
                        trimEnd: c.trimEnd + durationToRemove,
                        name: getElementNameWithSuffix(c.name, "left"),
                      }
                    : c
                ),
              }
            : track
        )
      );
    },

    // Split element and keep only the right portion
    splitAndKeepRight: (trackId, elementId, splitTime) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) return;

      const effectiveStart = element.startTime;
      const effectiveEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);

      if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

      get().pushHistory();

      const relativeTime = splitTime - element.startTime;

      updateTracksAndSave(
        get()._tracks.map((track) =>
          track.id === trackId
            ? {
                ...track,
                elements: track.elements.map((c) =>
                  c.id === elementId
                    ? {
                        ...c,
                        startTime: splitTime,
                        trimStart: c.trimStart + relativeTime,
                        name: getElementNameWithSuffix(c.name, "right"),
                      }
                    : c
                ),
              }
            : track
        )
      );
    },

    // Extract audio from video element to an audio track
    separateAudio: (trackId, elementId) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element || track?.type !== "media") return null;

      get().pushHistory();

      const existingAudioTrack = _tracks.find((t) => t.type === "audio");
      const audioElementId = generateUUID();

      if (existingAudioTrack) {
        updateTracksAndSave(
          get()._tracks.map((track) =>
            track.id === existingAudioTrack.id
              ? {
                  ...track,
                  elements: [
                    ...track.elements,
                    {
                      ...element,
                      id: audioElementId,
                      name: getElementNameWithSuffix(element.name, "audio"),
                    },
                  ],
                }
              : track
          )
        );
      } else {
        const newAudioTrack: TimelineTrack = {
          id: generateUUID(),
          name: "Audio Track",
          type: "audio",
          elements: [
            {
              ...element,
              id: audioElementId,
              name: getElementNameWithSuffix(element.name, "audio"),
            },
          ],
          muted: false,
        };

        updateTracksAndSave([...get()._tracks, newAudioTrack]);
      }

      return audioElementId;
    },

    // Replace media for an element
    replaceElementMedia: async (
      trackId: string,
      elementId: string,
      newFile: File
    ): Promise<{ success: boolean; error?: string }> => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((c) => c.id === elementId);

      if (!element) {
        return { success: false, error: "Timeline element not found" };
      }

      if (element.type !== "media") {
        return {
          success: false,
          error: "Replace is only available for media clips",
        };
      }

      try {
        const mediaStore = useMediaStore.getState();
        const projectStore = useProjectStore.getState();

        if (!projectStore.activeProject) {
          return { success: false, error: "No active project found" };
        }

        const {
          getFileType,
          getImageDimensions,
          generateVideoThumbnail,
          getMediaDuration,
        } = await import("./media-store");

        const fileType = getFileType(newFile);
        if (!fileType) {
          return {
            success: false,
            error:
              "Unsupported file type. Please select a video, audio, or image file.",
          };
        }

        const mediaData: Omit<MediaFile, "id"> = {
          name: newFile.name,
          type: fileType as MediaType,
          file: newFile,
          url: URL.createObjectURL(newFile),
        };

        try {
          if (fileType === "image") {
            const { width, height } = await getImageDimensions(newFile);
            mediaData.width = width;
            mediaData.height = height;
          } else if (fileType === "video") {
            const [duration, { thumbnailUrl, width, height }] =
              await Promise.all([
                getMediaDuration(newFile),
                generateVideoThumbnail(newFile),
              ]);
            mediaData.duration = duration;
            mediaData.thumbnailUrl = thumbnailUrl;
            mediaData.width = width;
            mediaData.height = height;
          } else if (fileType === "audio") {
            mediaData.duration = await getMediaDuration(newFile);
          }
        } catch (error) {
          return {
            success: false,
            error: `Failed to process ${fileType} file: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        try {
          await mediaStore.addMediaFile(
            projectStore.activeProject.id,
            mediaData
          );
        } catch (error) {
          return {
            success: false,
            error: `Failed to add media to project: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }

        const newMediaItem = mediaStore.mediaFiles.find(
          (item) => item.file === newFile
        );

        if (!newMediaItem) {
          return {
            success: false,
            error: "Failed to create media item in project. Please try again.",
          };
        }

        get().pushHistory();

        updateTracksAndSave(
          _tracks.map((track) =>
            track.id === trackId
              ? {
                  ...track,
                  elements: track.elements.map((c) =>
                    c.id === elementId
                      ? {
                          ...c,
                          mediaId: newMediaItem.id,
                          name: newMediaItem.name,
                          duration: newMediaItem.duration || c.duration,
                        }
                      : c
                  ),
                }
              : track
          )
        );

        return { success: true };
      } catch (error) {
        console.error("Failed to replace element media:", error);
        return {
          success: false,
          error: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },

    getTotalDuration: () => {
      const { _tracks } = get();
      if (_tracks.length === 0) return 0;

      const trackEndTimes = _tracks.map((track) =>
        track.elements.reduce((maxEnd, element) => {
          const elementEnd =
            element.startTime +
            element.duration -
            element.trimStart -
            element.trimEnd;
          return Math.max(maxEnd, elementEnd);
        }, 0)
      );

      return Math.max(...trackEndTimes, 0);
    },

    getProjectThumbnail: async (projectId) => {
      try {
        const project = await storageService.loadProject({ id: projectId });
        if (!project) return null;

        // For scene-based projects, use main scene timeline
        // For legacy projects, use legacy timeline format
        let sceneId: string | undefined;
        if (project.scenes && project.scenes.length > 0) {
          const mainScene = project.scenes.find((s) => s.isMain);
          sceneId = mainScene?.id;
        }

        const tracks = await storageService.loadTimeline({
          projectId,
          sceneId,
        });
        const mediaItems = await storageService.loadAllMediaFiles({
          projectId,
        });

        if (!tracks || !mediaItems.length) return null;

        const firstMediaElement = tracks
          .flatMap((track) => track.elements)
          .filter((element) => element.type === "media")
          .sort((a, b) => a.startTime - b.startTime)[0];

        if (!firstMediaElement) return null;

        const mediaFile = mediaItems.find(
          (item) => item.id === firstMediaElement.mediaId
        );
        if (!mediaFile) return null;

        if (mediaFile.type === "video" && mediaFile.file) {
          const { generateVideoThumbnail } = await import(
            "@/stores/media-store"
          );
          const { thumbnailUrl } = await generateVideoThumbnail(mediaFile.file);
          return thumbnailUrl;
        }
        if (mediaFile.type === "image" && mediaFile.url) {
          return mediaFile.url;
        }

        return null;
      } catch (error) {
        console.error("Failed to get project thumbnail:", error);
        return null;
      }
    },

    redo: () => {
      const { redoStack } = get();
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      updateTracksAndSave(next);
      set({ redoStack: redoStack.slice(0, -1) });
    },

    dragState: {
      isDragging: false,
      elementId: null,
      trackId: null,
      startMouseX: 0,
      startElementTime: 0,
      clickOffsetTime: 0,
      currentTime: 0,
    },

    setDragState: (dragState) =>
      set((state) => ({
        dragState: { ...state.dragState, ...dragState },
      })),

    startDrag: (
      elementId,
      trackId,
      startMouseX,
      startElementTime,
      clickOffsetTime
    ) => {
      set({
        dragState: {
          isDragging: true,
          elementId,
          trackId,
          startMouseX,
          startElementTime,
          clickOffsetTime,
          currentTime: startElementTime,
        },
      });
    },

    updateDragTime: (currentTime) => {
      set((state) => ({
        dragState: {
          ...state.dragState,
          currentTime,
        },
      }));
    },

    endDrag: () => {
      set({
        dragState: {
          isDragging: false,
          elementId: null,
          trackId: null,
          startMouseX: 0,
          startElementTime: 0,
          clickOffsetTime: 0,
          currentTime: 0,
        },
      });
    },

    loadProjectTimeline: async ({
      projectId,
      sceneId,
    }: {
      projectId: string;
      sceneId?: string;
    }) => {
      try {
        const tracks = await storageService.loadTimeline({
          projectId,
          sceneId,
        });

        if (tracks) {
          updateTracks(tracks);
        } else {
          const defaultTracks = ensureMainTrack([]);
          updateTracks(defaultTracks);
        }
        set({ history: [], redoStack: [] });
      } catch (error) {
        console.error("Failed to load timeline:", error);
        const defaultTracks = ensureMainTrack([]);
        updateTracks(defaultTracks);
        set({ history: [], redoStack: [] });
      }
    },

    saveProjectTimeline: async ({
      projectId,
      sceneId,
    }: {
      projectId: string;
      sceneId?: string;
    }) => {
      const { _tracks } = get();
      try {
        await storageService.saveTimeline({
          projectId,
          tracks: _tracks,
          sceneId,
        });
      } catch (error) {
        console.error("Failed to save timeline:", error);
      }
    },

    clearTimeline: () => {
      const defaultTracks = ensureMainTrack([]);
      updateTracks(defaultTracks);
      set({
        history: [],
        redoStack: [],
        selectedElements: [],
        clipboard: null,
      });
    },

    // Snapping actions
    toggleSnapping: () => {
      set((state) => ({ snappingEnabled: !state.snappingEnabled }));
    },

    // Ripple editing functions
    toggleRippleEditing: () => {
      set((state) => ({
        rippleEditingEnabled: !state.rippleEditingEnabled,
      }));
    },

    checkElementOverlap: (trackId, startTime, duration, excludeElementId) => {
      const track = get()._tracks.find((t) => t.id === trackId);
      if (!track) return false;

      const overlap = track.elements.some((element) => {
        const elementEnd =
          element.startTime +
          element.duration -
          element.trimStart -
          element.trimEnd;

        if (element.id === excludeElementId) {
          return false;
        }

        return (
          (startTime >= element.startTime && startTime < elementEnd) ||
          (startTime + duration > element.startTime &&
            startTime + duration <= elementEnd) ||
          (startTime < element.startTime && startTime + duration > elementEnd)
        );
      });
      return overlap;
    },

    findOrCreateTrack: (trackType) => {
      if (trackType === "text") {
        return get().insertTrackAt(trackType, 0);
      }

      const existingTrack = get()._tracks.find((t) => t.type === trackType);
      if (existingTrack) {
        return existingTrack.id;
      }

      return get().addTrack(trackType);
    },

    addElementAtTime: (item: MediaFile | TextElement, currentTime = 0) => {
      if (item.type === "text") {
        const targetTrackId = get().insertTrackAt("text", 0);
        get().addElementToTrack(
          targetTrackId,
          buildTextElement(item, currentTime)
        );
        return true;
      }

      const media = item as MediaFile;
      const trackType = media.type === "audio" ? "audio" : "media";
      const targetTrackId = get().insertTrackAt(trackType, 0);
      get().addElementToTrack(targetTrackId, {
        type: "media",
        mediaId: media.id,
        name: media.name,
        duration: media.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION,
        startTime: currentTime,
        trimStart: 0,
        trimEnd: 0,
        muted: false,
      });
      return true;
    },

    addElementToNewTrack: (item) => {
      if (item.type === "text") {
        const targetTrackId = get().insertTrackAt("text", 0);
        get().addElementToTrack(
          targetTrackId,
          buildTextElement(item as TextElement | DragData, 0)
        );
        return true;
      }

      const media = item as MediaFile;
      const trackType = media.type === "audio" ? "audio" : "media";
      const targetTrackId = get().insertTrackAt(trackType, 0);
      get().addElementToTrack(targetTrackId, {
        type: "media",
        mediaId: media.id,
        name: media.name,
        duration: media.duration || TIMELINE_CONSTANTS.DEFAULT_IMAGE_DURATION,
        startTime: 0,
        trimStart: 0,
        trimEnd: 0,
        muted: false,
      });
      return true;
    },

    copySelected: () => {
      const { selectedElements, _tracks } = get();
      if (selectedElements.length === 0) return;

      const items: Array<{
        trackType: TrackType;
        element: CreateTimelineElement;
      }> = [];

      for (const { trackId, elementId } of selectedElements) {
        const track = _tracks.find((t) => t.id === trackId);
        const element = track?.elements.find((e) => e.id === elementId);
        if (!track || !element) continue;

        // Prepare a creation-friendly copy without id
        const { id: _id, ...rest } = element as TimelineElement;
        items.push({
          trackType: track.type,
          element: rest as CreateTimelineElement,
        });
      }

      set({ clipboard: { items } });
    },

    pasteAtTime: (time) => {
      const { clipboard } = get();
      if (!clipboard || clipboard.items.length === 0) return;

      // Determine reference start time offset based on earliest element in clipboard
      const minStart = Math.min(
        ...clipboard.items.map((x) => x.element.startTime)
      );

      get().pushHistory();

      for (const item of clipboard.items) {
        const targetTrackId = get().findOrCreateTrack(item.trackType);
        const relativeOffset = item.element.startTime - minStart;
        const startTime = Math.max(0, time + relativeOffset);

        // Ensure no overlap on target track
        const duration =
          item.element.duration - item.element.trimStart - item.element.trimEnd;
        const hasOverlap = get().checkElementOverlap(
          targetTrackId,
          startTime,
          duration
        );
        if (hasOverlap) {
          // If overlap, nudge forward slightly until free (simple resolve)
          let candidate = startTime;
          let safety = 0;
          while (
            get().checkElementOverlap(targetTrackId, candidate, duration) &&
            safety < 1000
          ) {
            candidate += 0.01;
            safety += 1;
          }
          get().addElementToTrack(targetTrackId, {
            ...item.element,
            startTime: candidate,
          });
        } else {
          get().addElementToTrack(targetTrackId, {
            ...item.element,
            startTime,
          });
        }
      }
    },

    deleteSelected: (trackId?: string, elementId?: string) => {
      const { selectedElements, rippleEditingEnabled } = get();

      const elementsToDelete =
        trackId && elementId
          ? [{ trackId, elementId }]
          : selectedElements.length > 0
            ? selectedElements
            : [];

      if (elementsToDelete.length === 0) return;

      get().pushHistory();

      if (rippleEditingEnabled) {
        for (const { trackId: tId, elementId: eId } of elementsToDelete) {
          get().removeElementFromTrackWithRipple(tId, eId, false);
        }
      } else {
        updateTracksAndSave(
          get()
            ._tracks.map((track) => ({
              ...track,
              elements: track.elements.filter(
                (element) =>
                  !elementsToDelete.some(
                    ({ trackId: tId, elementId: eId }) =>
                      track.id === tId && element.id === eId
                  )
              ),
            }))
            .filter((track) => track.elements.length > 0)
        );
      }

      get().clearSelectedElements();
    },

    splitSelected: (splitTime, trackId?: string, elementId?: string) => {
      const { selectedElements, _tracks } = get();

      const elementsToProcess =
        trackId && elementId
          ? [{ trackId, elementId }]
          : selectedElements.length > 0
            ? selectedElements
            : [];

      if (elementsToProcess.length === 0) return;

      const elementsToSplit: Array<{
        trackId: string;
        elementId: string;
        element: TimelineElement;
      }> = [];

      for (const { trackId: tId, elementId: eId } of elementsToProcess) {
        const track = _tracks.find((t) => t.id === tId);
        const element = track?.elements.find((e) => e.id === eId);
        if (!track || !element) continue;

        const effectiveStart = element.startTime;
        const effectiveEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (splitTime > effectiveStart && splitTime < effectiveEnd) {
          elementsToSplit.push({ trackId: tId, elementId: eId, element });
        }
      }

      if (elementsToSplit.length === 0) {
        const { toast } = require("sonner");
        const isMultiple = elementsToProcess.length > 1;
        toast.error(
          isMultiple
            ? "Playhead must be within all selected elements to split"
            : "Playhead must be within element to split"
        );
        return;
      }

      get().pushHistory();

      updateTracksAndSave(
        get()._tracks.map((track) => {
          const elementsToSplitInTrack = elementsToSplit.filter(
            ({ trackId: tId }) => tId === track.id
          );

          if (elementsToSplitInTrack.length === 0) return track;

          return {
            ...track,
            elements: track.elements.flatMap((c) => {
              const elementToSplit = elementsToSplitInTrack.find(
                ({ elementId: eId }) => eId === c.id
              );

              if (!elementToSplit) return [c];

              const relativeTime = splitTime - elementToSplit.element.startTime;
              const firstDuration = relativeTime;
              const secondDuration =
                elementToSplit.element.duration -
                elementToSplit.element.trimStart -
                elementToSplit.element.trimEnd -
                relativeTime;

              const secondElementId = generateUUID();

              return [
                {
                  ...c,
                  trimEnd: c.trimEnd + secondDuration,
                  name: getElementNameWithSuffix(c.name, "left"),
                },
                {
                  ...c,
                  id: secondElementId,
                  startTime: splitTime,
                  trimStart: c.trimStart + firstDuration,
                  name: getElementNameWithSuffix(c.name, "right"),
                },
              ];
            }),
          };
        })
      );
    },

    toggleSelectedHidden: (trackId?: string, elementId?: string) => {
      const { selectedElements, _tracks } = get();

      const elementsToProcess =
        trackId && elementId
          ? [{ trackId, elementId }]
          : selectedElements.length > 0
            ? selectedElements
            : [];

      if (elementsToProcess.length === 0) return;

      get().pushHistory();

      const shouldHide = elementsToProcess.some(
        ({ trackId: tId, elementId: eId }) => {
          const track = _tracks.find((t) => t.id === tId);
          const element = track?.elements.find((e) => e.id === eId);
          return element && !element.hidden;
        }
      );

      updateTracksAndSave(
        _tracks.map((track) => ({
          ...track,
          elements: track.elements.map((element) => {
            const shouldUpdate = elementsToProcess.some(
              ({ trackId: tId, elementId: eId }) =>
                track.id === tId && element.id === eId
            );
            return shouldUpdate && element.hidden !== shouldHide
              ? { ...element, hidden: shouldHide }
              : element;
          }),
        }))
      );
    },

    toggleSelectedMuted: (trackId?: string, elementId?: string) => {
      const { selectedElements, _tracks } = get();

      const elementsToProcess =
        trackId && elementId
          ? [{ trackId, elementId }]
          : selectedElements.length > 0
            ? selectedElements
            : [];

      if (elementsToProcess.length === 0) return;

      get().pushHistory();

      const audioElements = elementsToProcess.filter(
        ({ trackId: tId, elementId: eId }) => {
          const track = _tracks.find((t) => t.id === tId);
          const element = track?.elements.find((e) => e.id === eId);
          return element?.type === "media";
        }
      );

      if (audioElements.length === 0) return;

      const shouldMute = audioElements.some(
        ({ trackId: tId, elementId: eId }) => {
          const track = _tracks.find((t) => t.id === tId);
          const element = track?.elements.find((e) => e.id === eId);
          return element?.type === "media" && !element.muted;
        }
      );

      updateTracksAndSave(
        _tracks.map((track) => ({
          ...track,
          elements: track.elements.map((element) => {
            const shouldUpdate = audioElements.some(
              ({ trackId: tId, elementId: eId }) =>
                track.id === tId && element.id === eId
            );
            return shouldUpdate &&
              element.type === "media" &&
              element.muted !== shouldMute
              ? { ...element, muted: shouldMute }
              : element;
          }),
        }))
      );
    },

    duplicateElement: (trackId, elementId) => {
      const { _tracks } = get();
      const track = _tracks.find((t) => t.id === trackId);
      const element = track?.elements.find((e) => e.id === elementId);
      if (!track || !element) return;

      const { id, ...elementWithoutId } = element;
      const effectiveDuration =
        element.duration - element.trimStart - element.trimEnd;

      get().addElementToTrack(trackId, {
        ...elementWithoutId,
        name: `${element.name} (copy)`,
        startTime: element.startTime + effectiveDuration + 0.1,
      } as CreateTimelineElement);
    },

    revealElementInMedia: (elementId) => {
      const {
        useMediaPanelStore,
      } = require("../components/editor/media-panel/store");
      const { requestRevealMedia } = useMediaPanelStore.getState();

      const { _tracks } = get();
      const element = _tracks
        .flatMap((track) => track.elements)
        .find((el) => el.id === elementId);

      if (element?.type === "media") {
        requestRevealMedia(element.mediaId);
      }
    },

    replaceElementWithFile: async (trackId, elementId, file) => {
      try {
        const result = await get().replaceElementMedia(
          trackId,
          elementId,
          file
        );
        if (result.success) {
          const { toast } = await import("sonner");
          toast.success("Clip replaced successfully");
        } else {
          const { toast } = await import("sonner");
          toast.error(result.error || "Failed to replace clip");
        }
      } catch (error) {
        console.error("Unexpected error replacing clip:", error);
        const { toast } = await import("sonner");
        toast.error(
          `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },

    getContextMenuState: (trackId, elementId) => {
      const { selectedElements, _tracks } = get();
      const { currentTime } = usePlaybackStore.getState();
      const { mediaFiles } = useMediaStore.getState();

      const isMultipleSelected = selectedElements.length > 1;
      const isCurrentElementSelected = selectedElements.some(
        (sel) => sel.trackId === trackId && sel.elementId === elementId
      );

      const hasAudioElements = selectedElements.some(
        ({ trackId: tId, elementId: eId }) => {
          const selectedTrack = _tracks.find((t) => t.id === tId);
          const selectedElement = selectedTrack?.elements.find(
            (e) => e.id === eId
          );
          if (selectedElement?.type !== "media") return false;
          const mediaElement = selectedElement as MediaElement;
          const mediaItem = mediaFiles.find(
            (file: MediaFile) => file.id === mediaElement.mediaId
          );
          return mediaItem?.type === "audio" || mediaItem?.type === "video";
        }
      );

      const canSplitSelected = selectedElements.every(
        ({ trackId: tId, elementId: eId }) => {
          const selectedTrack = _tracks.find((t) => t.id === tId);
          const selectedElement = selectedTrack?.elements.find(
            (e) => e.id === eId
          );
          if (!selectedElement) return false;
          const effectiveStart = selectedElement.startTime;
          const effectiveEnd =
            selectedElement.startTime +
            (selectedElement.duration -
              selectedElement.trimStart -
              selectedElement.trimEnd);
          return currentTime > effectiveStart && currentTime < effectiveEnd;
        }
      );

      return {
        isMultipleSelected,
        isCurrentElementSelected,
        hasAudioElements,
        canSplitSelected,
        currentTime,
      };
    },
  };
});

function buildTextElement(
  raw: TextElement | DragData,
  startTime: number
): CreateTimelineElement {
  const t = raw as Partial<TextElement>;

  return {
    type: "text",
    name: t.name ?? DEFAULT_TEXT_ELEMENT.name,
    content: t.content ?? DEFAULT_TEXT_ELEMENT.content,
    duration: t.duration ?? TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION,
    startTime,
    trimStart: 0,
    trimEnd: 0,
    fontSize:
      typeof t.fontSize === "number"
        ? t.fontSize
        : DEFAULT_TEXT_ELEMENT.fontSize,
    fontFamily: t.fontFamily ?? DEFAULT_TEXT_ELEMENT.fontFamily,
    color: t.color ?? DEFAULT_TEXT_ELEMENT.color,
    backgroundColor: t.backgroundColor ?? DEFAULT_TEXT_ELEMENT.backgroundColor,
    textAlign: t.textAlign ?? DEFAULT_TEXT_ELEMENT.textAlign,
    fontWeight: t.fontWeight ?? DEFAULT_TEXT_ELEMENT.fontWeight,
    fontStyle: t.fontStyle ?? DEFAULT_TEXT_ELEMENT.fontStyle,
    textDecoration: t.textDecoration ?? DEFAULT_TEXT_ELEMENT.textDecoration,
    x: typeof t.x === "number" ? t.x : DEFAULT_TEXT_ELEMENT.x,
    y: typeof t.y === "number" ? t.y : DEFAULT_TEXT_ELEMENT.y,
    rotation:
      typeof t.rotation === "number"
        ? t.rotation
        : DEFAULT_TEXT_ELEMENT.rotation,
    opacity:
      typeof t.opacity === "number" ? t.opacity : DEFAULT_TEXT_ELEMENT.opacity,
  };
}
