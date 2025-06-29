import { create } from "zustand";
import type { TrackType } from "@/types/timeline";

// Helper function to manage clip naming with suffixes
const getClipNameWithSuffix = (
  originalName: string,
  suffix: string
): string => {
  // Remove existing suffixes to prevent accumulation
  const baseName = originalName
    .replace(/ \(left\)$/, "")
    .replace(/ \(right\)$/, "")
    .replace(/ \(audio\)$/, "")
    .replace(/ \(split \d+\)$/, "");

  return `${baseName} (${suffix})`;
};

export interface TimelineClip {
  id: string;
  mediaId: string;
  name: string;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  clips: TimelineClip[];
  muted?: boolean;
}

interface TimelineStore {
  tracks: TimelineTrack[];
  history: TimelineTrack[][];
  redoStack: TimelineTrack[][];

  // Multi-selection
  selectedClips: { trackId: string; clipId: string }[];
  selectClip: (trackId: string, clipId: string, multi?: boolean) => void;
  deselectClip: (trackId: string, clipId: string) => void;
  clearSelectedClips: () => void;
  setSelectedClips: (clips: { trackId: string; clipId: string }[]) => void;

  // Drag state
  dragState: {
    isDragging: boolean;
    clipId: string | null;
    trackId: string | null;
    startMouseX: number;
    startClipTime: number;
    clickOffsetTime: number;
    currentTime: number;
  };
  setDragState: (dragState: Partial<TimelineStore["dragState"]>) => void;
  startDrag: (
    clipId: string,
    trackId: string,
    startMouseX: number,
    startClipTime: number,
    clickOffsetTime: number
  ) => void;
  updateDragTime: (currentTime: number) => void;
  endDrag: () => void;

  // Actions
  addTrack: (type: TrackType) => string;
  removeTrack: (trackId: string) => void;
  addClipToTrack: (trackId: string, clip: Omit<TimelineClip, "id">) => void;
  removeClipFromTrack: (trackId: string, clipId: string) => void;
  moveClipToTrack: (
    fromTrackId: string,
    toTrackId: string,
    clipId: string
  ) => void;
  updateClipTrim: (
    trackId: string,
    clipId: string,
    trimStart: number,
    trimEnd: number
  ) => void;
  updateClipStartTime: (
    trackId: string,
    clipId: string,
    startTime: number
  ) => void;
  toggleTrackMute: (trackId: string) => void;

  // Split operations for clips
  splitClip: (
    trackId: string,
    clipId: string,
    splitTime: number
  ) => string | null;
  splitAndKeepLeft: (
    trackId: string,
    clipId: string,
    splitTime: number
  ) => void;
  splitAndKeepRight: (
    trackId: string,
    clipId: string,
    splitTime: number
  ) => void;
  separateAudio: (trackId: string, clipId: string) => string | null;

  // Computed values
  getTotalDuration: () => number;

  // History actions
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  tracks: [],
  history: [],
  redoStack: [],
  selectedClips: [],

  pushHistory: () => {
    const { tracks, history, redoStack } = get();
    set({
      history: [...history, JSON.parse(JSON.stringify(tracks))],
      redoStack: [],
    });
  },

  undo: () => {
    const { history, redoStack, tracks } = get();
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    set({
      tracks: prev,
      history: history.slice(0, -1),
      redoStack: [...redoStack, JSON.parse(JSON.stringify(tracks))],
    });
  },

  selectClip: (trackId, clipId, multi = false) => {
    set((state) => {
      const exists = state.selectedClips.some(
        (c) => c.trackId === trackId && c.clipId === clipId
      );
      if (multi) {
        return exists
          ? {
              selectedClips: state.selectedClips.filter(
                (c) => !(c.trackId === trackId && c.clipId === clipId)
              ),
            }
          : { selectedClips: [...state.selectedClips, { trackId, clipId }] };
      } else {
        return { selectedClips: [{ trackId, clipId }] };
      }
    });
  },

  deselectClip: (trackId, clipId) => {
    set((state) => ({
      selectedClips: state.selectedClips.filter(
        (c) => !(c.trackId === trackId && c.clipId === clipId)
      ),
    }));
  },

  clearSelectedClips: () => {
    set({ selectedClips: [] });
  },

  setSelectedClips: (clips) => set({ selectedClips: clips }),

  addTrack: (type) => {
    const state = get(); // Get current state to access existing tracks
    state.pushHistory();

    const existingTracksOfType = state.tracks.filter(track => track.type === type);
    const trackNumber = existingTracksOfType.length + 1;

    const newTrack: TimelineTrack = {
      id: crypto.randomUUID(),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${trackNumber}`,
      type,
      clips: [],
      muted: false,
    };
    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    return newTrack.id;
  },

  removeTrack: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.filter((track) => track.id !== trackId),
    }));
  },

  addClipToTrack: (trackId, clipData) => {
    get().pushHistory();
    const newClip: TimelineClip = {
      ...clipData,
      id: crypto.randomUUID(),
      startTime: clipData.startTime || 0,
      trimStart: 0,
      trimEnd: 0,
    };

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      ),
    }));
  },

  removeClipFromTrack: (trackId, clipId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks
        .map((track) =>
          track.id === trackId
            ? {
                ...track,
                clips: track.clips.filter((clip) => clip.id !== clipId),
              }
            : track
        )
        .filter((track) => track.clips.length > 0),
    }));
  },

  moveClipToTrack: (fromTrackId, toTrackId, clipId) => {
    get().pushHistory();
    set((state) => {
      const fromTrack = state.tracks.find((track) => track.id === fromTrackId);
      const clipToMove = fromTrack?.clips.find((clip) => clip.id === clipId);

      if (!clipToMove) return state;

      return {
        tracks: state.tracks
          .map((track) => {
            if (track.id === fromTrackId) {
              return {
                ...track,
                clips: track.clips.filter((clip) => clip.id !== clipId),
              };
            } else if (track.id === toTrackId) {
              return {
                ...track,
                clips: [...track.clips, clipToMove],
              };
            }
            return track;
          })
          .filter((track) => track.clips.length > 0),
      };
    });
  },

  updateClipTrim: (trackId, clipId, trimStart, trimEnd) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? { ...clip, trimStart, trimEnd } : clip
              ),
            }
          : track
      ),
    }));
  },

  updateClipStartTime: (trackId, clipId, startTime) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((clip) =>
                clip.id === clipId ? { ...clip, startTime } : clip
              ),
            }
          : track
      ),
    }));
  },

  toggleTrackMute: (trackId) => {
    get().pushHistory();
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, muted: !track.muted } : track
      ),
    }));
  },

  splitClip: (trackId, clipId, splitTime) => {
    const { tracks } = get();
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);

    if (!clip) return null;

    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return null;

    get().pushHistory();

    const relativeTime = splitTime - clip.startTime;
    const firstDuration = relativeTime;
    const secondDuration =
      clip.duration - clip.trimStart - clip.trimEnd - relativeTime;

    const secondClipId = crypto.randomUUID();

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.flatMap((c) =>
                c.id === clipId
                  ? [
                      {
                        ...c,
                        trimEnd: c.trimEnd + secondDuration,
                        name: getClipNameWithSuffix(c.name, "left"),
                      },
                      {
                        ...c,
                        id: secondClipId,
                        startTime: splitTime,
                        trimStart: c.trimStart + firstDuration,
                        name: getClipNameWithSuffix(c.name, "right"),
                      },
                    ]
                  : [c]
              ),
            }
          : track
      ),
    }));

    return secondClipId;
  },

  // Split clip and keep only the left portion
  splitAndKeepLeft: (trackId, clipId, splitTime) => {
    const { tracks } = get();
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);

    if (!clip) return;

    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

    get().pushHistory();

    const relativeTime = splitTime - clip.startTime;
    const durationToRemove =
      clip.duration - clip.trimStart - clip.trimEnd - relativeTime;

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((c) =>
                c.id === clipId
                  ? {
                      ...c,
                      trimEnd: c.trimEnd + durationToRemove,
                      name: getClipNameWithSuffix(c.name, "left"),
                    }
                  : c
              ),
            }
          : track
      ),
    }));
  },

  // Split clip and keep only the right portion
  splitAndKeepRight: (trackId, clipId, splitTime) => {
    const { tracks } = get();
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);

    if (!clip) return;

    const effectiveStart = clip.startTime;
    const effectiveEnd =
      clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

    if (splitTime <= effectiveStart || splitTime >= effectiveEnd) return;

    get().pushHistory();

    const relativeTime = splitTime - clip.startTime;

    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map((c) =>
                c.id === clipId
                  ? {
                      ...c,
                      startTime: splitTime,
                      trimStart: c.trimStart + relativeTime,
                      name: getClipNameWithSuffix(c.name, "right"),
                    }
                  : c
              ),
            }
          : track
      ),
    }));
  },

  // Extract audio from video clip to an audio track
  separateAudio: (trackId: string, clipId: string): string | null => {
    const state = get();
    state.pushHistory();

    const track = state.tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);

    if (!clip || track?.type !== "video") {
      console.error("Clip not found or not from a video track");
      return null;
    }

    const audioClip: TimelineClip = {
      id: crypto.randomUUID(),
      mediaId: clip.mediaId,
      name: `${clip.name} (Audio)`,
      duration: clip.duration,
      startTime: clip.startTime,
      trimStart: 0,
      trimEnd: 0,
    };

    const findAvailableTrackAndSlot = (newClip: TimelineClip): string => {
      for (const t of state.tracks) {
        if (t.type === "audio") {
          let overlap = false;
          for (const existingClip of t.clips) {
            if (
              newClip.startTime < existingClip.startTime + existingClip.duration &&
              newClip.startTime + newClip.duration > existingClip.startTime
            ) {
              overlap = true;
              break;
            }
          }
          if (!overlap) {
            return t.id; // Found an available track
          }
        }
      }

      // No suitable track found, create a new one
      const existingAudioTracks = state.tracks.filter(t => t.type === "audio");
      const trackNumber = existingAudioTracks.length + 1;
      const newTrack: TimelineTrack = {
        id: crypto.randomUUID(),
        name: `Audio Track ${trackNumber}`,
        type: "audio",
        clips: [],
        muted: false,
      };
      // We need to update the state to add the new track *before* we return its ID
      set((state) => ({
        tracks: [...state.tracks, newTrack],
      }));
      return newTrack.id;
    };

    const targetTrackId = findAvailableTrackAndSlot(audioClip);

    set((state) => ({
      tracks: state.tracks.map((t) =>
        t.id === targetTrackId
          ? { ...t, clips: [...t.clips, audioClip] }
          : t
      ),
    }));

    return audioClip.id;
  },

  getTotalDuration: () => {
    const { tracks } = get();
    if (tracks.length === 0) return 0;

    const trackEndTimes = tracks.map((track) =>
      track.clips.reduce((maxEnd, clip) => {
        const clipEnd =
          clip.startTime + clip.duration - clip.trimStart - clip.trimEnd;
        return Math.max(maxEnd, clipEnd);
      }, 0)
    );

    return Math.max(...trackEndTimes, 0);
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    set({ tracks: next, redoStack: redoStack.slice(0, -1) });
  },

  dragState: {
    isDragging: false,
    clipId: null,
    trackId: null,
    startMouseX: 0,
    startClipTime: 0,
    clickOffsetTime: 0,
    currentTime: 0,
  },

  setDragState: (dragState) =>
    set((state) => ({
      dragState: { ...state.dragState, ...dragState },
    })),

  startDrag: (clipId, trackId, startMouseX, startClipTime, clickOffsetTime) => {
    set({
      dragState: {
        isDragging: true,
        clipId,
        trackId,
        startMouseX,
        startClipTime,
        clickOffsetTime,
        currentTime: startClipTime,
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
        clipId: null,
        trackId: null,
        startMouseX: 0,
        startClipTime: 0,
        clickOffsetTime: 0,
        currentTime: 0,
      },
    });
  },
}));
