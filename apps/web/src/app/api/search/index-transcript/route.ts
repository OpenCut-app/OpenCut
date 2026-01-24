import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createIndexingPipeline } from "@/lib/search/indexing-pipeline";
import {
  createHttpEmbeddingProvider,
  createNoopEmbeddingProvider,
} from "@/lib/search/segment-embedding";
import { env } from "@/env";
import { insertVideoAndSegments } from "@/lib/search/search-storage";

const tokenSchema = z.object({
  text: z.string().min(1),
  startTimeSeconds: z.number().nonnegative(),
  endTimeSeconds: z.number().nonnegative(),
  confidence: z.number().optional(),
});

const requestSchema = z.object({
  sourceKey: z.string().min(1),
  title: z.string().min(1),
  durationSeconds: z.number().positive(),
  fps: z.number().positive().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  ownerId: z.string().uuid().optional(),
  tokens: z.array(tokenSchema).min(1),
});

export const POST = async (request: NextRequest) => {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = requestSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const dimensionsValue = env.EMBEDDINGS_DIMENSIONS
      ? Number(env.EMBEDDINGS_DIMENSIONS)
      : undefined;
    const embeddingProvider =
      env.EMBEDDINGS_API_URL && env.EMBEDDINGS_MODEL
        ? createHttpEmbeddingProvider({
            apiUrl: env.EMBEDDINGS_API_URL,
            apiKey: env.EMBEDDINGS_API_KEY,
            model: env.EMBEDDINGS_MODEL,
            dimensions:
              dimensionsValue && Number.isFinite(dimensionsValue)
                ? dimensionsValue
                : undefined,
          })
        : createNoopEmbeddingProvider();
    const pipeline = createIndexingPipeline({ embeddingProvider });

    const requestData = await pipeline.buildVideoIndexRequest(validation.data);
    const { videoId } = await insertVideoAndSegments(requestData);

    return NextResponse.json({
      videoId,
      segmentCount: requestData.segments.length,
      embeddingsCreated: requestData.segments.some((segment) => !!segment.embedding),
      segments: requestData.segments.map((segment) => ({
        segmentId: segment.segmentId,
        startTimeSeconds: segment.startTimeSeconds,
        endTimeSeconds: segment.endTimeSeconds,
        transcriptText: segment.transcriptText,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
