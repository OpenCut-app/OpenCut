import { create } from "zustand";
import { toast } from "sonner";
import { generateUUID } from "@/lib/utils";
import type {
  EffectPreset,
  EffectCategory,
  EffectParameters,
  EffectInstance,
  EffectType,
} from "@/types/effects";
import { useTimelineStore } from "./timeline-store";
import { usePlaybackStore } from "./playback-store";
import { useProjectStore } from "./project-store";

// Predefined effect presets
const EFFECT_PRESETS: EffectPreset[] = [
  // Basic adjustments
  {
    id: "brightness-up",
    name: "Brighten",
    description: "Increase brightness",
    category: "basic",
    icon: "☀️",
    parameters: { brightness: 20 },
  },
  {
    id: "brightness-down",
    name: "Darken",
    description: "Decrease brightness",
    category: "basic",
    icon: "🌙",
    parameters: { brightness: -20 },
  },
  {
    id: "contrast-up",
    name: "High Contrast",
    description: "Increase contrast",
    category: "basic",
    icon: "⚡",
    parameters: { contrast: 30 },
  },
  {
    id: "saturation-up",
    name: "Vibrant",
    description: "Increase saturation",
    category: "color",
    icon: "🌈",
    parameters: { saturation: 40 },
  },
  {
    id: "saturation-down",
    name: "Muted",
    description: "Decrease saturation",
    category: "color",
    icon: "🎨",
    parameters: { saturation: -30 },
  },

  // Color effects
  {
    id: "sepia",
    name: "Sepia",
    description: "Classic sepia tone",
    category: "vintage",
    icon: "📷",
    parameters: { sepia: 80 },
  },
  {
    id: "grayscale",
    name: "Black & White",
    description: "Convert to grayscale",
    category: "vintage",
    icon: "⚫",
    parameters: { grayscale: 100 },
  },
  {
    id: "invert",
    name: "Invert",
    description: "Invert colors",
    category: "artistic",
    icon: "🔄",
    parameters: { invert: 100 },
  },

  // Artistic effects
  {
    id: "vintage",
    name: "Vintage",
    description: "Old film look",
    category: "vintage",
    icon: "🎞️",
    parameters: {
      vintage: 70,
      grain: 20,
      vignette: 30,
    },
  },
  {
    id: "dramatic",
    name: "Dramatic",
    description: "High contrast dramatic look",
    category: "cinematic",
    icon: "🎭",
    parameters: {
      contrast: 40,
      brightness: -10,
      saturation: -20,
    },
  },
  {
    id: "warm",
    name: "Warm",
    description: "Warm color temperature",
    category: "color",
    icon: "🔥",
    parameters: {
      warm: 60,
      hue: 15,
    },
  },
  {
    id: "cool",
    name: "Cool",
    description: "Cool color temperature",
    category: "color",
    icon: "❄️",
    parameters: {
      cool: 60,
      hue: -15,
    },
  },
  {
    id: "cinematic",
    name: "Cinematic",
    description: "Movie-like appearance",
    category: "cinematic",
    icon: "🎬",
    parameters: {
      cinematic: 80,
      vignette: 40,
      contrast: 25,
    },
  },

  // Blur effects
  {
    id: "gaussian-blur",
    name: "Gaussian Blur",
    description: "Soft blur effect",
    category: "basic",
    icon: "🌫️",
    parameters: {
      blur: 15,
      blurType: "gaussian",
    },
  },
  {
    id: "motion-blur",
    name: "Motion Blur",
    description: "Motion blur effect",
    category: "distortion",
    icon: "💨",
    parameters: {
      blur: 20,
      blurType: "motion",
    },
  },

  // Distortion effects
  {
    id: "vignette",
    name: "Vignette",
    description: "Darken edges",
    category: "cinematic",
    icon: "⭕",
    parameters: { vignette: 50 },
  },
  {
    id: "grain",
    name: "Film Grain",
    description: "Add film grain",
    category: "vintage",
    icon: "🌾",
    parameters: { grain: 30 },
  },
  {
    id: "sharpen",
    name: "Sharpen",
    description: "Increase sharpness",
    category: "basic",
    icon: "🔪",
    parameters: { sharpen: 40 },
  },
  {
    id: "emboss",
    name: "Emboss",
    description: "3D emboss effect",
    category: "artistic",
    icon: "🏔️",
    parameters: { emboss: 60 },
  },
  {
    id: "edge",
    name: "Edge Detection",
    description: "Highlight edges",
    category: "artistic",
    icon: "📐",
    parameters: { edge: 70 },
  },
  {
    id: "pixelate",
    name: "Pixelate",
    description: "Pixelation effect",
    category: "distortion",
    icon: "🧩",
    parameters: { pixelate: 20 },
  },
];

interface EffectsStore {
  // Presets
  presets: EffectPreset[];
  selectedCategory: EffectCategory | "all";

  // Applied effects
  appliedEffects: EffectInstance[];
  selectedEffect: EffectInstance | null;

  // UI state
  isAddingEffect: boolean;
  searchQuery: string;

  // Actions
  setSelectedCategory: (category: EffectCategory | "all") => void;
  setSearchQuery: (query: string) => void;
  setSelectedEffect: (effect: EffectInstance | null) => void;

  // Effect management
  applyEffectToElement: (
    elementId: string,
    trackId: string,
    preset: EffectPreset
  ) => Promise<boolean>;

  updateEffectParameters: (
    effectId: string,
    parameters: Partial<EffectParameters>
  ) => void;

  removeEffect: (effectId: string) => void;
  toggleEffect: (effectId: string) => void;

  // Timeline integration
  addEffectToTimeline: (preset: EffectPreset) => Promise<boolean>;

  // Utility
  getEffectsForElement: (elementId: string) => EffectInstance[];
  getFilteredPresets: () => EffectPreset[];
}

export const useEffectsStore = create<EffectsStore>((set, get) => ({
  // Initial state
  presets: EFFECT_PRESETS,
  selectedCategory: "all",
  appliedEffects: [],
  selectedEffect: null,
  isAddingEffect: false,
  searchQuery: "",

  // Actions
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedEffect: (effect) => set({ selectedEffect: effect }),

  // Effect management
  applyEffectToElement: async (elementId, trackId, preset) => {
    const { currentTime } = usePlaybackStore.getState();
    const { activeProject } = useProjectStore.getState();

    if (!activeProject) {
      toast.error("No active project");
      return false;
    }

    set({ isAddingEffect: true });

    try {
      const newEffect: EffectInstance = {
        id: generateUUID(),
        name: preset.name,
        effectType: preset.id as EffectType,
        parameters: { ...preset.parameters },
        elementId,
        trackId,
        startTime: currentTime,
        endTime: currentTime + 5, // Default 5 second duration
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      set((state) => ({
        appliedEffects: [...state.appliedEffects, newEffect],
        selectedEffect: newEffect,
      }));

      toast.success(`Applied "${preset.name}" effect`);
      return true;
    } catch (error) {
      console.error("Failed to apply effect:", error);
      toast.error("Failed to apply effect");
      return false;
    } finally {
      set({ isAddingEffect: false });
    }
  },

  updateEffectParameters: (effectId, parameters) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.map((effect) =>
        effect.id === effectId
          ? {
              ...effect,
              parameters: { ...effect.parameters, ...parameters },
              updatedAt: new Date(),
            }
          : effect
      ),
      selectedEffect:
        state.selectedEffect?.id === effectId
          ? {
              ...state.selectedEffect,
              parameters: { ...state.selectedEffect.parameters, ...parameters },
              updatedAt: new Date(),
            }
          : state.selectedEffect,
    }));
  },

  removeEffect: (effectId) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.filter(
        (effect) => effect.id !== effectId
      ),
      selectedEffect:
        state.selectedEffect?.id === effectId ? null : state.selectedEffect,
    }));

    toast.success("Effect removed");
  },

  toggleEffect: (effectId) => {
    set((state) => ({
      appliedEffects: state.appliedEffects.map((effect) =>
        effect.id === effectId
          ? { ...effect, enabled: !effect.enabled }
          : effect
      ),
      selectedEffect:
        state.selectedEffect?.id === effectId
          ? { ...state.selectedEffect, enabled: !state.selectedEffect.enabled }
          : state.selectedEffect,
    }));
  },

  addEffectToTimeline: async (preset) => {
    const { currentTime } = usePlaybackStore.getState();
    const { activeProject } = useProjectStore.getState();
    const { tracks } = useTimelineStore.getState();

    if (!activeProject) {
      toast.error("No active project");
      return false;
    }

    // Find any media track (not just the first one)
    const mediaTracks = tracks.filter((track) => track.type === "media");
    console.log("Available tracks:", tracks.map(t => ({ type: t.type, elements: t.elements.length })));
    console.log("Media tracks found:", mediaTracks.length);
    
    // Also check for any media elements that might be video
    const allMediaElements = mediaTracks.flatMap(track => track.elements);
    console.log("Total media elements:", allMediaElements.length);
    
    if (mediaTracks.length === 0) {
      toast.error("No media tracks found. Add a video to your timeline first.");
      return false;
    }

    // Try to find an element at current time in any media track
    let targetElement = null;
    let targetTrack = null;

    for (const track of mediaTracks) {
      const elementAtTime = track.elements.find((element) => {
        const elementEnd = element.startTime + element.duration;
        return currentTime >= element.startTime && currentTime < elementEnd;
      });

      if (elementAtTime) {
        targetElement = elementAtTime;
        targetTrack = track;
        break;
      }
    }

    // If no element at current time, find the closest element
    if (!targetElement) {
      for (const track of mediaTracks) {
        if (track.elements.length > 0) {
          // Find the element that's closest to current time
          const closestElement = track.elements.reduce((closest, element) => {
            const elementEnd = element.startTime + element.duration;
            const elementMiddle = element.startTime + element.duration / 2;
            const closestMiddle = closest.startTime + closest.duration / 2;
            
            const currentDistance = Math.abs(currentTime - elementMiddle);
            const closestDistance = Math.abs(currentTime - closestMiddle);
            
            return currentDistance < closestDistance ? element : closest;
          });

          targetElement = closestElement;
          targetTrack = track;
          break;
        }
      }
    }

    if (!targetElement || !targetTrack) {
      toast.error("No media elements found. Add a video to your timeline first.");
      return false;
    }

    return get().applyEffectToElement(targetElement.id, targetTrack.id, preset);
  },

  getEffectsForElement: (elementId) => {
    const { appliedEffects } = get();
    return appliedEffects.filter((effect) => effect.elementId === elementId);
  },

  getFilteredPresets: () => {
    const { presets, selectedCategory, searchQuery } = get();

    let filtered = presets;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (preset) => preset.category === selectedCategory
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (preset) =>
          preset.name.toLowerCase().includes(query) ||
          preset.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  },
}));
