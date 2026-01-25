export interface TranscriptToken {
  id: string;
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  confidence?: number;
  isFiller?: boolean;
}

export interface MediaTranscript {
  mediaId: string;
  language?: string;
  tokens: TranscriptToken[];
}

export interface TranscriptTimelineToken {
  id: string;
  mediaId: string;
  elementId: string;
  text: string;
  confidence?: number;
  isFiller?: boolean;
  sourceStartTimeSeconds: number;
  sourceEndTimeSeconds: number;
  timelineStartTimeSeconds: number;
  timelineEndTimeSeconds: number;
}

export interface TranscriptCharSpan {
  tokenId: string;
  startIndex: number;
  endIndex: number;
}

export interface MergedTranscript {
  text: string;
  tokens: TranscriptTimelineToken[];
  tokenCharSpans: TranscriptCharSpan[];
  durationSeconds: number;
}

export type StitchingPresetName = "tight" | "balanced" | "loose";

export interface AutoStitchingSettings {
  silenceThresholdSeconds: number;
  speechPaddingSeconds: number;
  fillerWordRemovalEnabled: boolean;
  fillerWords: string[];
  fillerPaddingSeconds: number;
  minimumSegmentDurationSeconds: number;
  mergeAdjacentSegmentsWithinSeconds: number;
}

