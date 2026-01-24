import type {
  SegmentIndexRecord,
  TranscriptToken,
  VideoIndexRequest,
} from "@/types/semantic-search";
import { chunkTranscript } from "@/lib/search/segment-chunking";
import { buildSegmentText } from "@/lib/search/segment-text";
import type { EmbeddingProvider } from "@/lib/search/segment-embedding";

interface IndexingPipelineOptions {
  embeddingProvider: EmbeddingProvider;
}

const createSegmentRecords = async (
  tokens: TranscriptToken[],
  embeddingProvider: EmbeddingProvider
): Promise<SegmentIndexRecord[]> => {
  const segments = chunkTranscript(tokens);
  const segmentRecords: SegmentIndexRecord[] = [];

  for (const segment of segments) {
    const combinedText = buildSegmentText({
      transcriptText: segment.transcriptText,
    });

    const embedding = await embeddingProvider.createEmbedding(combinedText);

    segmentRecords.push({
      segmentId: crypto.randomUUID(),
      ...segment,
      embedding: embedding ?? undefined,
    });
  }

  return segmentRecords;
};

const buildVideoIndexRequest = async ({
  sourceKey,
  title,
  durationSeconds,
  fps,
  width,
  height,
  ownerId,
  tokens,
  embeddingProvider,
}: {
  sourceKey: string;
  title: string;
  durationSeconds: number;
  fps?: number;
  width?: number;
  height?: number;
  ownerId?: string;
  tokens: TranscriptToken[];
  embeddingProvider: EmbeddingProvider;
}): Promise<VideoIndexRequest> => {
  const segments = await createSegmentRecords(tokens, embeddingProvider);

  return {
    sourceKey,
    title,
    durationSeconds,
    fps,
    width,
    height,
    ownerId,
    segments,
  };
};

const createIndexingPipeline = (options: IndexingPipelineOptions) => ({
  buildVideoIndexRequest: (params: {
    sourceKey: string;
    title: string;
    durationSeconds: number;
    fps?: number;
    width?: number;
    height?: number;
    ownerId?: string;
    tokens: TranscriptToken[];
  }) =>
    buildVideoIndexRequest({
      ...params,
      embeddingProvider: options.embeddingProvider,
    }),
});

export { createIndexingPipeline };
