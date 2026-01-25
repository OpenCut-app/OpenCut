import { create } from "zustand";
import type { MediaTranscript } from "@/types/transcript";
import { createMediaTranscriptFromWhisperSegments } from "@/lib/transcript-timeline";

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

interface TranscriptStore {
  transcriptsByMediaId: Record<string, MediaTranscript>;

  setTranscript: (mediaId: string, transcript: MediaTranscript) => void;
  setTranscriptFromWhisperSegments: (options: {
    mediaId: string;
    segments: WhisperSegment[];
    language?: string;
  }) => void;
  removeTranscript: (mediaId: string) => void;
  clearTranscripts: () => void;
}

export const useTranscriptStore = create<TranscriptStore>((set) => ({
  transcriptsByMediaId: {},

  setTranscript: (mediaId, transcript) => {
    set((state) => ({
      transcriptsByMediaId: { ...state.transcriptsByMediaId, [mediaId]: transcript },
    }));
  },

  setTranscriptFromWhisperSegments: ({ mediaId, segments, language }) => {
    const transcript = createMediaTranscriptFromWhisperSegments({
      mediaId,
      segments,
      language,
    });
    set((state) => ({
      transcriptsByMediaId: { ...state.transcriptsByMediaId, [mediaId]: transcript },
    }));
  },

  removeTranscript: (mediaId) => {
    set((state) => {
      const { [mediaId]: _unused, ...rest } = state.transcriptsByMediaId;
      return { transcriptsByMediaId: rest };
    });
  },

  clearTranscripts: () => {
    set({ transcriptsByMediaId: {} });
  },
}));

