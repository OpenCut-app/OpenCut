import type { AiEngineProject, ChunkAnalysis, VideoChunk } from "@/types/ai-engine";
import type { TranscriptToken } from "@/types/semantic-search";
import { indexTranscriptAndEnrich } from "@/lib/search/segment-indexing-client";

interface IndexingSummary {
  videoId: string;
  sourceVideoId: string;
  segmentCount: number;
  enrichedSegments: number;
}

const buildTranscriptTokensForVideo = ({
  chunks,
  analyses,
  sourceVideoId,
}: {
  chunks: VideoChunk[];
  analyses: ChunkAnalysis[];
  sourceVideoId: string;
}): TranscriptToken[] => {
  const tokenList: TranscriptToken[] = [];
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  for (const analysis of analyses) {
    const chunk = chunkById.get(analysis.chunkId);
    if (!chunk || chunk.sourceVideoId !== sourceVideoId) {
      continue;
    }

    const transcriptSegments = analysis.transcript ?? [];

    for (const segment of transcriptSegments) {
      const startTimeSeconds =
        segment.endTime <= chunk.duration + 0.05
          ? chunk.startTime + segment.startTime
          : segment.startTime;
      const endTimeSeconds =
        segment.endTime <= chunk.duration + 0.05
          ? chunk.startTime + segment.endTime
          : segment.endTime;

      tokenList.push({
        text: segment.text,
        startTimeSeconds,
        endTimeSeconds,
        confidence: segment.confidence,
      });
    }
  }

  return tokenList.sort((left, right) => left.startTimeSeconds - right.startTimeSeconds);
};

const indexAiEngineProject = async (
  project: AiEngineProject
): Promise<IndexingSummary[]> => {
  const summaries: IndexingSummary[] = [];

  for (const sourceVideo of project.sourceVideos) {
    const tokens = buildTranscriptTokensForVideo({
      chunks: project.chunks,
      analyses: project.analyses,
      sourceVideoId: sourceVideo.id,
    });

    if (tokens.length === 0) {
      continue;
    }

    const result = await indexTranscriptAndEnrich({
      sourceKey: sourceVideo.id,
      title: sourceVideo.name,
      durationSeconds: sourceVideo.duration,
      fps: sourceVideo.fps,
      width: sourceVideo.width,
      height: sourceVideo.height,
      videoFile: sourceVideo.file,
      tokens,
    });

    summaries.push({
      videoId: result.videoId,
      sourceVideoId: sourceVideo.id,
      segmentCount: result.segments.length,
      enrichedSegments: result.enrichedSegments,
    });
  }

  return summaries;
};

export type { IndexingSummary };
export { indexAiEngineProject };
