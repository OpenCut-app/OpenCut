import type { SegmentIndexRecord } from "@/types/semantic-search";
import { extractVideoSegmentBase64 } from "@/lib/search/segment-clipper";
import { buildQualityScore } from "@/lib/search/segment-text";

interface SegmentEnrichmentRequest {
  videoId: string;
  videoFile: File;
  segments: SegmentIndexRecord[];
  defaultQualityScore?: number;
}

interface SegmentEnrichmentResult {
  updatedSegments: number;
}

const enrichSegments = async (
  request: SegmentEnrichmentRequest
): Promise<SegmentEnrichmentResult> => {
  const payloadSegments: Array<{
    segmentId: string;
    startTimeSeconds: number;
    endTimeSeconds: number;
    transcriptText: string;
    videoBase64: string;
    mimeType: string;
    qualityScore?: number;
  }> = [];

  for (const segment of request.segments) {
    if (!segment.segmentId) {
      continue;
    }

    const clip = await extractVideoSegmentBase64({
      videoFile: request.videoFile,
      startTimeSeconds: segment.startTimeSeconds,
      endTimeSeconds: segment.endTimeSeconds,
    });

    const heuristicScore = buildQualityScore({
      transcriptText: segment.transcriptText,
      visualSummary: segment.visualSummary,
      visualTags: segment.visualTags,
      keywords: segment.keywords,
    });
    const qualityScore = segment.qualityScore ?? request.defaultQualityScore ?? heuristicScore;

    payloadSegments.push({
      segmentId: segment.segmentId,
      startTimeSeconds: segment.startTimeSeconds,
      endTimeSeconds: segment.endTimeSeconds,
      transcriptText: segment.transcriptText,
      videoBase64: clip.base64,
      mimeType: clip.mimeType,
      qualityScore,
    });
  }

  if (payloadSegments.length === 0) {
    return { updatedSegments: 0 };
  }

  const response = await fetch("/api/search/enrich-segments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId: request.videoId,
      segments: payloadSegments,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Segment enrichment failed: ${errorText}`);
  }

  const responseData = await response.json();
  const updatedSegments =
    typeof responseData?.updatedSegments === "number"
      ? responseData.updatedSegments
      : 0;

  return { updatedSegments };
};

export type { SegmentEnrichmentRequest, SegmentEnrichmentResult };
export { enrichSegments };
