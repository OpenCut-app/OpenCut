import { create } from "zustand";
import type { SoundEffect, SavedSound } from "@/types/sounds";
import { storageService } from "@/lib/storage/storage-service";
import { toast } from "sonner";
import { useMediaStore } from "./media-store";
import { useTimelineStore } from "./timeline-store";
import { useProjectStore } from "./project-store";
import { usePlaybackStore } from "./playback-store";

interface SoundsStore {
  topSoundEffects: SoundEffect[];
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;

  // Filter state
  showCommercialOnly: boolean;
  toggleCommercialFilter: () => void;

  // Search state
  searchQuery: string;
  searchResults: SoundEffect[];
  isSearching: boolean;
  searchError: string | null;
  lastSearchQuery: string;
  scrollPosition: number;

  // Pagination state
  currentPage: number;
  hasNextPage: boolean;
  totalCount: number;
  isLoadingMore: boolean;

  // Saved sounds state
  savedSounds: SavedSound[];
  isSavedSoundsLoaded: boolean;
  isLoadingSavedSounds: boolean;
  savedSoundsError: string | null;

  // Timeline integration
  addSoundToTimeline: (sound: SoundEffect) => Promise<boolean>;

  setTopSoundEffects: (sounds: SoundEffect[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHasLoaded: (loaded: boolean) => void;

  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SoundEffect[]) => void;
  setSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  setLastSearchQuery: (query: string) => void;
  setScrollPosition: (position: number) => void;

  // Pagination actions
  setCurrentPage: (page: number) => void;
  setHasNextPage: (hasNext: boolean) => void;
  setTotalCount: (count: number) => void;
  setLoadingMore: (loading: boolean) => void;
  appendSearchResults: (results: SoundEffect[]) => void;
  appendTopSounds: (results: SoundEffect[]) => void;
  resetPagination: () => void;

  // Saved sounds actions
  loadSavedSounds: () => Promise<void>;
  saveSoundEffect: (soundEffect: SoundEffect) => Promise<void>;
  removeSavedSound: (soundId: number) => Promise<void>;
  isSoundSaved: (soundId: number) => boolean;
  toggleSavedSound: (soundEffect: SoundEffect) => Promise<void>;
  clearSavedSounds: () => Promise<void>;
}

export const useSoundsStore = create<SoundsStore>((set, get) => ({
  topSoundEffects: [],
  isLoading: false,
  error: null,
  hasLoaded: false,
  showCommercialOnly: true,

  toggleCommercialFilter: () => {
    set((state) => ({ showCommercialOnly: !state.showCommercialOnly }));
  },

  // Search state
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  searchError: null,
  lastSearchQuery: "",
  scrollPosition: 0,

  // Pagination state
  currentPage: 1,
  hasNextPage: false,
  totalCount: 0,
  isLoadingMore: false,

  // Saved sounds state
  savedSounds: [],
  isSavedSoundsLoaded: false,
  isLoadingSavedSounds: false,
  savedSoundsError: null,

  setTopSoundEffects: (sounds) => set({ topSoundEffects: sounds }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setHasLoaded: (loaded) => set({ hasLoaded: loaded }),

  // Search actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) =>
    set({ searchResults: results, currentPage: 1 }),
  setSearching: (searching) => set({ isSearching: searching }),
  setSearchError: (error) => set({ searchError: error }),
  setLastSearchQuery: (query) => set({ lastSearchQuery: query }),
  setScrollPosition: (position) => set({ scrollPosition: position }),

  // Pagination actions
  setCurrentPage: (page) => set({ currentPage: page }),
  setHasNextPage: (hasNext) => set({ hasNextPage: hasNext }),
  setTotalCount: (count) => set({ totalCount: count }),
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  appendSearchResults: (results) =>
    set((state) => ({
      searchResults: [...state.searchResults, ...results],
    })),
  appendTopSounds: (results) =>
    set((state) => ({
      topSoundEffects: [...state.topSoundEffects, ...results],
    })),
  resetPagination: () =>
    set({
      currentPage: 1,
      hasNextPage: false,
      totalCount: 0,
      isLoadingMore: false,
    }),

  // Saved sounds actions
  loadSavedSounds: async () => {
    if (get().isSavedSoundsLoaded) return;

    try {
      set({ isLoadingSavedSounds: true, savedSoundsError: null });
      const savedSoundsData = await storageService.loadSavedSounds();
      set({
        savedSounds: savedSoundsData.sounds,
        isSavedSoundsLoaded: true,
        isLoadingSavedSounds: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load saved sounds";
      set({
        savedSoundsError: errorMessage,
        isLoadingSavedSounds: false,
      });
      console.error("Failed to load saved sounds:", error);
    }
  },

  saveSoundEffect: async (soundEffect: SoundEffect) => {
    try {
      await storageService.saveSoundEffect({ soundEffect });

      // Refresh saved sounds
      const savedSoundsData = await storageService.loadSavedSounds();
      set({ savedSounds: savedSoundsData.sounds });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save sound";
      set({ savedSoundsError: errorMessage });
      toast.error("Failed to save sound");
      console.error("Failed to save sound:", error);
    }
  },

  removeSavedSound: async (soundId: number) => {
    try {
      await storageService.removeSavedSound({ soundId });

      // Update local state immediately
      set((state) => ({
        savedSounds: state.savedSounds.filter((sound) => sound.id !== soundId),
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove sound";
      set({ savedSoundsError: errorMessage });
      toast.error("Failed to remove sound");
      console.error("Failed to remove sound:", error);
    }
  },

  isSoundSaved: (soundId: number) => {
    const { savedSounds } = get();
    return savedSounds.some((sound) => sound.id === soundId);
  },

  toggleSavedSound: async (soundEffect: SoundEffect) => {
    const { isSoundSaved, saveSoundEffect, removeSavedSound } = get();

    if (isSoundSaved(soundEffect.id)) {
      await removeSavedSound(soundEffect.id);
    } else {
      await saveSoundEffect(soundEffect);
    }
  },

  clearSavedSounds: async () => {
    try {
      await storageService.clearSavedSounds();
      set({
        savedSounds: [],
        savedSoundsError: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to clear saved sounds";
      set({ savedSoundsError: errorMessage });
      toast.error("Failed to clear saved sounds");
      console.error("Failed to clear saved sounds:", error);
    }
  },

  addSoundToTimeline: async (sound) => {
    const activeProject = useProjectStore.getState().activeProject;
    if (!activeProject) {
      toast.error("No active project");
      return false;
    }

    const audioUrl = sound.previewUrl;
    if (!audioUrl) {
      toast.error("Sound file not available");
      return false;
    }

    try {
      const response = await fetch(audioUrl);
      if (!response.ok)
        throw new Error(`Failed to download audio: ${response.statusText}`);

      const blob = await response.blob();
      const file = new File([blob], `${sound.name}.mp3`, {
        type: "audio/mpeg",
      });

      await useMediaStore.getState().addMediaFile(activeProject.id, {
        name: sound.name,
        type: "audio",
        file,
        duration: sound.duration,
        url: URL.createObjectURL(file),
      });

      const mediaItem = useMediaStore
        .getState()
        .mediaFiles.find((item) => item.file === file);
      if (!mediaItem) throw new Error("Failed to create media item");

      const success = useTimelineStore
        .getState()
        .addElementAtTime(mediaItem, usePlaybackStore.getState().currentTime);

      if (success) {
        return true;
      }
      throw new Error("Failed to add to timeline - check for overlaps");
    } catch (error) {
      console.error("Failed to add sound to timeline:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add sound to timeline",
        { id: `sound-${sound.id}` }
      );
      return false;
    }
  },
}));
