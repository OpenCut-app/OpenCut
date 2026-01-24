import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insertVideoAndSegments, upsertSegments } from "@/lib/search/search-storage";

const segmentSchema = z.object({
  segmentId: z.string().uuid().optional(),
  startTimeSeconds: z.number().nonnegative(),
  endTimeSeconds: z.number().nonnegative(),
  transcriptText: z.string().min(1),
  visualSummary: z.string().optional(),
  visualTags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  qualityScore: z.number().min(0).max(1).optional(),
  embedding: z.array(z.number()).optional(),
});

const requestSchema = z.object({
  video: z.object({
    sourceKey: z.string().min(1),
    title: z.string().min(1),
    durationSeconds: z.number().positive(),
    fps: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    ownerId: z.string().uuid().optional(),
  }),
  segments: z.array(segmentSchema).min(1),
});

const upsertSchema = z.object({
  videoId: z.string().uuid(),
  segments: z.array(segmentSchema).min(1),
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

    const { video, segments } = validation.data;
    const result = await insertVideoAndSegments({
      ...video,
      segments,
    });

    return NextResponse.json({ videoId: result.videoId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const PUT = async (request: NextRequest) => {
  try {
    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const validation = upsertSchema.safeParse(payload);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { videoId, segments } = validation.data;
    await upsertSegments(videoId, segments);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
