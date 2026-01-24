import type { SegmentIndexRecord, SegmentSearchQuery, SegmentSearchResult, VideoIndexRequest } from "@/types/semantic-search";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
  }
  return fallback;
};

const toStringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toStringArrayOrNull = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string") : null;

const parseSegmentRow = (row: Record<string, unknown>): SegmentSearchResult => ({
  segmentId: String(row.id ?? \"\"),
  videoId: String(row.video_id ?? \"\"),
  startTimeSeconds: toNumber(row.start_time_seconds),
  endTimeSeconds: toNumber(row.end_time_seconds),
  transcriptText: toStringOrNull(row.transcript_text),
  visualSummary: toStringOrNull(row.visual_summary),
  visualTags: toStringArrayOrNull(row.visual_tags),
  keywords: toStringArrayOrNull(row.keywords),
  qualityScore: row.quality_score === null ? null : toNumber(row.quality_score, 0.5),
  similarityScore: row.similarity_score === null ? null : toNumber(row.similarity_score, 0),
});

const insertVideoAndSegments = async (
  payload: VideoIndexRequest
): Promise<{ videoId: string }> => {
  const { client } = createSupabaseServerClient();

  const { data: videoData, error: videoError } = await client
    .from("video_assets")
    .insert({
      source_key: payload.sourceKey,
      title: payload.title,
      duration_seconds: payload.durationSeconds,
      fps: payload.fps,
      width: payload.width,
      height: payload.height,
      owner_id: payload.ownerId,
    })
    .select("id")
    .single();

  if (videoError || !videoData) {
    throw new Error(videoError?.message || "Failed to create video record");
  }

  const segmentRows = payload.segments.map((segment): Record<string, unknown> => ({
    video_id: videoData.id,
    start_time_seconds: segment.startTimeSeconds,
    end_time_seconds: segment.endTimeSeconds,
    transcript_text: segment.transcriptText,
    visual_summary: segment.visualSummary ?? null,
    visual_tags: segment.visualTags ?? null,
    keywords: segment.keywords ?? null,
    quality_score: segment.qualityScore ?? null,
    embedding: segment.embedding ?? null,
  }));

  if (segmentRows.length > 0) {
    const { error: segmentError } = await client
      .from("video_segments")
      .insert(segmentRows);

    if (segmentError) {
      throw new Error(segmentError.message);
    }
  }

  return { videoId: videoData.id };
};

const searchSegments = async (
  query: SegmentSearchQuery
): Promise<SegmentSearchResult[]> => {
  const { client } = createSupabaseServerClient();
  const limit = query.limit ?? 12;
  const minQualityScore = query.minQualityScore ?? 0;

  if (query.queryEmbedding && query.queryEmbedding.length > 0) {
    const { data, error } = await client.rpc("search_video_segments", {
      query_text: query.queryText,
      query_embedding: query.queryEmbedding,
      match_count: limit,
      min_quality: minQualityScore,
      context_window: query.contextWindowSeconds ?? 0,
      owner_id_filter: query.ownerId ?? null,
      video_id_filter: query.videoId ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .filter((row) => isRecord(row))
      .map((row) => parseSegmentRow(row));
  }

  const { data, error } = await client.rpc("search_video_segments_text", {
    query_text: query.queryText,
    match_count: limit,
    min_quality: minQualityScore,
    context_window: query.contextWindowSeconds ?? 0,
    owner_id_filter: query.ownerId ?? null,
    video_id_filter: query.videoId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .filter((row) => isRecord(row))
    .map((row) => parseSegmentRow(row));
};

const upsertSegments = async (
  videoId: string,
  segments: SegmentIndexRecord[]
): Promise<void> => {
  const { client } = createSupabaseServerClient();

  const segmentRows = segments.map((segment): Record<string, unknown> => {
    const row: Record<string, unknown> = {
      video_id: videoId,
      start_time_seconds: segment.startTimeSeconds,
      end_time_seconds: segment.endTimeSeconds,
      transcript_text: segment.transcriptText,
      visual_summary: segment.visualSummary ?? null,
      visual_tags: segment.visualTags ?? null,
      keywords: segment.keywords ?? null,
      quality_score: segment.qualityScore ?? null,
      embedding: segment.embedding ?? null,
    };

    if (segment.segmentId) {
      row.id = segment.segmentId;
    }

    return row;
  });

  if (segmentRows.length === 0) {
    return;
  }

  const { error } = await client.from("video_segments").upsert(segmentRows);

  if (error) {
    throw new Error(error.message);
  }
};

export { insertVideoAndSegments, searchSegments, upsertSegments };
