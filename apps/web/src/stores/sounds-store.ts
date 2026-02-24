import { create } from "zustand";
import type { SoundEffect, SavedSound } from "@/types/sounds";
import { storageService } from "@/services/storage/service";
import { toast } from "sonner";
import { EditorCore } from "@/core";
import { buildLibraryAudioElement } from "@/lib/timeline/element-utils";

interface SoundsStore {
	topSoundEffects: SoundEffect[];
	isLoading: boolean;
	error: string | null;
	hasLoaded: boolean;
	showCommercialOnly: boolean;
	toggleCommercialFilter: () => void;
	searchQuery: string;
	searchResults: SoundEffect[];
	isSearching: boolean;
	searchError: string | null;
	lastSearchQuery: string;
	scrollPosition: number;
	currentPage: number;
	hasNextPage: boolean;
	totalCount: number;
	isLoadingMore: boolean;
	savedSounds: SavedSound[];
	isSavedSoundsLoaded: boolean;
	isLoadingSavedSounds: boolean;
	savedSoundsError: string | null;

	addSoundToTimeline: ({ sound }: { sound: SoundEffect }) => Promise<boolean>;
	setTopSoundEffects: ({ sounds }: { sounds: SoundEffect[] }) => void;
	setLoading: ({ loading }: { loading: boolean }) => void;
	setError: ({ error }: { error: string | null }) => void;
	setHasLoaded: ({ loaded }: { loaded: boolean }) => void;
	setSearchQuery: ({ query }: { query: string }) => void;
	setSearchResults: ({ results }: { results: SoundEffect[] }) => void;
	setSearching: ({ searching }: { searching: boolean }) => void;
	setSearchError: ({ error }: { error: string | null }) => void;
	setLastSearchQuery: ({ query }: { query: string }) => void;
	setScrollPosition: ({ position }: { position: number }) => void;
	setCurrentPage: ({ page }: { page: number }) => void;
	setHasNextPage: ({ hasNext }: { hasNext: boolean }) => void;
	setTotalCount: ({ count }: { count: number }) => void;
	setLoadingMore: ({ loading }: { loading: boolean }) => void;
	appendSearchResults: ({ results }: { results: SoundEffect[] }) => void;
	appendTopSounds: ({ results }: { results: SoundEffect[] }) => void;
	resetPagination: () => void;
	loadSavedSounds: () => Promise<void>;
	saveSoundEffect: ({
		soundEffect,
	}: {
		soundEffect: SoundEffect;
	}) => Promise<void>;
	removeSavedSound: ({ soundId }: { soundId: number }) => Promise<void>;
	isSoundSaved: ({ soundId }: { soundId: number }) => boolean;
	toggleSavedSound: ({
		soundEffect,
	}: {
		soundEffect: SoundEffect;
	}) => Promise<void>;
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

	searchQuery: "",
	searchResults: [],
	isSearching: false,
	searchError: null,
	lastSearchQuery: "",
	scrollPosition: 0,
	currentPage: 1,
	hasNextPage: false,
	totalCount: 0,
	isLoadingMore: false,
	savedSounds: [],
	isSavedSoundsLoaded: false,
	isLoadingSavedSounds: false,
	savedSoundsError: null,

	setTopSoundEffects: ({ sounds }) => set({ topSoundEffects: sounds }),
	setLoading: ({ loading }) => set({ isLoading: loading }),
	setError: ({ error }) => set({ error }),
	setHasLoaded: ({ loaded }) => set({ hasLoaded: loaded }),
	setSearchQuery: ({ query }) => set({ searchQuery: query }),
	setSearchResults: ({ results }) =>
		set({ searchResults: results, currentPage: 1 }),
	setSearching: ({ searching }) => set({ isSearching: searching }),
	setSearchError: ({ error }) => set({ searchError: error }),
	setLastSearchQuery: ({ query }) => set({ lastSearchQuery: query }),
	setScrollPosition: ({ position }) => set({ scrollPosition: position }),
	setCurrentPage: ({ page }) => set({ currentPage: page }),
	setHasNextPage: ({ hasNext }) => set({ hasNextPage: hasNext }),
	setTotalCount: ({ count }) => set({ totalCount: count }),
	setLoadingMore: ({ loading }) => set({ isLoadingMore: loading }),

	appendSearchResults: ({ results }) =>
		set((state) => ({
			searchResults: [...state.searchResults, ...results],
		})),

	appendTopSounds: ({ results }) =>
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

	saveSoundEffect: async ({ soundEffect }) => {
		try {
			await storageService.saveSoundEffect({ soundEffect });

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

	removeSavedSound: async ({ soundId }) => {
		try {
			await storageService.removeSavedSound({ soundId });

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

	isSoundSaved: ({ soundId }) => {
		const { savedSounds } = get();
		return savedSounds.some((sound) => sound.id === soundId);
	},

	toggleSavedSound: async ({ soundEffect }) => {
		const { isSoundSaved, saveSoundEffect, removeSavedSound } = get();

		if (isSoundSaved({ soundId: soundEffect.id })) {
			await removeSavedSound({ soundId: soundEffect.id });
		} else {
			await saveSoundEffect({ soundEffect });
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

	addSoundToTimeline: async ({ sound }) => {
		const audioUrl = sound.previewUrl;
		if (!audioUrl) {
			toast.error("Sound file not available");
			return false;
		}

		try {
			const editor = EditorCore.getInstance();
			const currentTime = editor.playback.getCurrentTime();
			const tracks = editor.timeline.getTracks();

			const response = await fetch(audioUrl);
			if (!response.ok)
				throw new Error(`Failed to download audio: ${response.statusText}`);

			const arrayBuffer = await response.arrayBuffer();
			const audioContext = new AudioContext();
			const buffer = await audioContext.decodeAudioData(arrayBuffer);

			const audioTrack = tracks.find((t) => t.type === "audio");
			let trackId: string;

			if (audioTrack) {
				trackId = audioTrack.id;
			} else {
				trackId = editor.timeline.addTrack({ type: "audio" });
			}

			const element = buildLibraryAudioElement({
				sourceUrl: audioUrl,
				name: sound.name,
				duration: sound.duration,
				startTime: currentTime,
				buffer,
			});

			editor.timeline.insertElement({
				placement: { mode: "explicit", trackId },
				element,
			});
			return true;
		} catch (error) {
			console.error("Failed to add sound to timeline:", error);
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to add sound to timeline",
				{ id: `sound-${sound.id}` },
			);
			return false;
		}
	},
}));
