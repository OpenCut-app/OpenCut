import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeVideoSegment } from "@/lib/search/vlm-gemini";
import { upsertSegments } from "@/lib/search/search-storage";
import type { SegmentIndexRecord } from "@/types/semantic-search";

const segmentSchema = z.object({
  segmentId: z.string().uuid(),
  startTimeSeconds: z.number().nonnegative(),
  endTimeSeconds: z.number().positive(),
  transcriptText: z.string().min(1),
  videoBase64: z.string().min(1),
  mimeType: z.string().min(1),
  qualityScore: z.number().min(0).max(1).optional(),
});

const requestSchema = z.object({
  videoId: z.string().uuid(),
  segments: z.array(segmentSchema).min(1),
});

const buildSegmentRecords = async (
  segments: Array<z.infer<typeof segmentSchema>>
): Promise<SegmentIndexRecord[]> => {
  const records: SegmentIndexRecord[] = [];

  for (const segment of segments) {
    const visualContext = await analyzeVideoSegment({
      videoBase64: segment.videoBase64,
      mimeType: segment.mimeType,
      segmentStartSeconds: segment.startTimeSeconds,
      segmentEndSeconds: segment.endTimeSeconds,
      transcriptText: segment.transcriptText,
    });

    const qualityScore =
      typeof visualContext.qualityScore === "number"
        ? visualContext.qualityScore
        : segment.qualityScore;

    records.push({
      segmentId: segment.segmentId,
      startTimeSeconds: segment.startTimeSeconds,
      endTimeSeconds: segment.endTimeSeconds,
      transcriptText: segment.transcriptText,
      visualSummary: visualContext.visualSummary,
      visualTags: visualContext.visualTags,
      keywords: visualContext.keywords,
      qualityScore,
    });
  }

  return records;
};

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

    const { videoId, segments } = validation.data;
    const records = await buildSegmentRecords(segments);
    await upsertSegments(videoId, records);

    return NextResponse.json({
      updatedSegments: records.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
