import type { SegmentSearchQuery, SegmentSearchResult } from "@/types/semantic-search";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const searchSegmentsClient = async (
  query: SegmentSearchQuery
): Promise<SegmentSearchResult[]> => {
  const response = await fetch("/api/search/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Search failed: ${errorText}`);
  }

  const data = await response.json();
  if (!isRecord(data) || !Array.isArray(data.results)) {
    return [];
  }

  return data.results
    .filter((result) => isRecord(result))
    .map((result) => ({
      segmentId: typeof result.segmentId === "string" ? result.segmentId : "",
      videoId: typeof result.videoId === "string" ? result.videoId : "",
      startTimeSeconds:
        typeof result.startTimeSeconds === "number" ? result.startTimeSeconds : 0,
      endTimeSeconds:
        typeof result.endTimeSeconds === "number" ? result.endTimeSeconds : 0,
      transcriptText: typeof result.transcriptText === "string" ? result.transcriptText : null,
      visualSummary: typeof result.visualSummary === "string" ? result.visualSummary : null,
      visualTags: Array.isArray(result.visualTags) ? result.visualTags : null,
      keywords: Array.isArray(result.keywords) ? result.keywords : null,
      qualityScore: typeof result.qualityScore === "number" ? result.qualityScore : null,
      similarityScore:
        typeof result.similarityScore === "number" ? result.similarityScore : null,
      contextGroupId: typeof result.contextGroupId === "string" ? result.contextGroupId : undefined,
    }))
    .filter((result) => result.segmentId.length > 0);
};

export { searchSegmentsClient };
