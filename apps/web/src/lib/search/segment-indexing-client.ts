import type { SegmentIndexRecord, TranscriptToken } from "@/types/semantic-search";
import { enrichSegments } from "@/lib/search/segment-enrichment";

interface IndexingClientRequest {
  sourceKey: string;
  title: string;
  durationSeconds: number;
  videoFile: File;
  tokens: TranscriptToken[];
  fps?: number;
  width?: number;
  height?: number;
  ownerId?: string;
}

interface IndexingClientResponse {
  videoId: string;
  segments: SegmentIndexRecord[];
  enrichedSegments: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseSegmentsResponse = (segments: unknown): SegmentIndexRecord[] => {
  if (!Array.isArray(segments)) return [];

  return segments
    .filter((segment) => isRecord(segment))
    .map((record) => {
      return {
        segmentId: typeof record.segmentId === "string" ? record.segmentId : undefined,
        startTimeSeconds:
          typeof record.startTimeSeconds === "number" ? record.startTimeSeconds : 0,
        endTimeSeconds:
          typeof record.endTimeSeconds === "number" ? record.endTimeSeconds : 0,
        transcriptText:
          typeof record.transcriptText === "string" ? record.transcriptText : "",
      };
    })
    .filter((segment) => segment.transcriptText.length > 0);
};

const indexTranscriptAndEnrich = async (
  request: IndexingClientRequest
): Promise<IndexingClientResponse> => {
  const response = await fetch("/api/search/index-transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceKey: request.sourceKey,
      title: request.title,
      durationSeconds: request.durationSeconds,
      fps: request.fps,
      width: request.width,
      height: request.height,
      ownerId: request.ownerId,
      tokens: request.tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcript indexing failed: ${errorText}`);
  }

  const responseData = await response.json();
  const videoId = typeof responseData?.videoId === "string" ? responseData.videoId : "";

  if (!videoId) {
    throw new Error("Transcript indexing failed: missing videoId");
  }

  const segments = parseSegmentsResponse(responseData?.segments);
  const enrichmentResult = await enrichSegments({
    videoId,
    videoFile: request.videoFile,
    segments,
  });

  return {
    videoId,
    segments,
    enrichedSegments: enrichmentResult.updatedSegments,
  };
};

export type { IndexingClientRequest, IndexingClientResponse };
export { indexTranscriptAndEnrich };
