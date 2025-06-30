import { create } from "zustand";


export interface EffectValues {
  blur: number;      
  opacity: number;   
}


export interface ClipEffects {
  clipId: string;
  trackId: string;
  effects: EffectValues;
}

interface EffectsStore {
  clipEffects: ClipEffects[];
  
  updateClipEffect: (
    trackId: string,
    clipId: string,
    effectType: keyof EffectValues,
    value: number
  ) => void;
  
  getClipEffects: (trackId: string, clipId: string) => EffectValues;
  
  removeClipEffects: (trackId: string, clipId: string) => void;
  
  clearAllEffects: () => void;
}

const DEFAULT_EFFECTS: EffectValues = {
  blur: 0,
  opacity: 100,
};

export const useEffectsStore = create<EffectsStore>((set, get) => ({
  clipEffects: [],

  updateClipEffect: (trackId, clipId, effectType, value) => {
    set((state) => {
      const existingIndex = state.clipEffects.findIndex(
        (ce) => ce.clipId === clipId && ce.trackId === trackId
      );

      if (existingIndex >= 0) {
        const updatedClipEffects = [...state.clipEffects];
        updatedClipEffects[existingIndex] = {
          ...updatedClipEffects[existingIndex],
          effects: {
            ...updatedClipEffects[existingIndex].effects,
            [effectType]: value,
          },
        };
        return { clipEffects: updatedClipEffects };
      } else {
        const newClipEffect: ClipEffects = {
          clipId,
          trackId,
          effects: {
            ...DEFAULT_EFFECTS,
            [effectType]: value,
          },
        };
        return { clipEffects: [...state.clipEffects, newClipEffect] };
      }
    });
  },

  getClipEffects: (trackId, clipId) => {
    const { clipEffects } = get();
    const found = clipEffects.find(
      (ce) => ce.clipId === clipId && ce.trackId === trackId
    );
    return found ? found.effects : DEFAULT_EFFECTS;
  },

  removeClipEffects: (trackId, clipId) => {
    set((state) => ({
      clipEffects: state.clipEffects.filter(
        (ce) => !(ce.clipId === clipId && ce.trackId === trackId)
      ),
    }));
  },

  clearAllEffects: () => {
    set({ clipEffects: [] });
  },
})); 