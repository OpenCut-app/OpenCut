interface TranscriptToken {
  text: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  confidence?: number;
}

interface TranscriptSegment {
  startTimeSeconds: number;
  endTimeSeconds: number;
  transcriptText: string;
}

interface SegmentVisualContext {
  visualSummary?: string;
  visualTags?: string[];
  keywords?: string[];
  qualityScore?: number;
}

interface SegmentIndexRecord extends TranscriptSegment, SegmentVisualContext {
  segmentId?: string;
  embedding?: number[];
}

interface VideoIndexRequest {
  sourceKey: string;
  title: string;
  durationSeconds: number;
  fps?: number;
  width?: number;
  height?: number;
  ownerId?: string;
  segments: SegmentIndexRecord[];
}

interface SegmentSearchQuery {
  queryText: string;
  queryEmbedding?: number[];
  limit?: number;
  minQualityScore?: number;
  contextWindowSeconds?: number;
  ownerId?: string;
  videoId?: string;
}

interface SegmentSearchResult {
  segmentId: string;
  videoId: string;
  startTimeSeconds: number;
  endTimeSeconds: number;
  transcriptText: string | null;
  visualSummary: string | null;
  visualTags: string[] | null;
  keywords: string[] | null;
  qualityScore: number | null;
  similarityScore: number | null;
  contextGroupId?: string;
}

interface ChunkingOptions {
  minSegmentDurationSeconds: number;
  maxSegmentDurationSeconds: number;
  pauseThresholdSeconds: number;
  maxTokensPerSegment: number;
}

export type {
  TranscriptToken,
  TranscriptSegment,
  SegmentVisualContext,
  SegmentIndexRecord,
  VideoIndexRequest,
  SegmentSearchQuery,
  SegmentSearchResult,
  ChunkingOptions,
};
