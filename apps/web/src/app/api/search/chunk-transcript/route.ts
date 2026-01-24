import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chunkTranscript } from "@/lib/search/segment-chunking";

const tokenSchema = z.object({
  text: z.string().min(1),
  startTimeSeconds: z.number().nonnegative(),
  endTimeSeconds: z.number().nonnegative(),
  confidence: z.number().optional(),
});

const requestSchema = z.object({
  tokens: z.array(tokenSchema).min(1),
  options: z
    .object({
      minSegmentDurationSeconds: z.number().positive().optional(),
      maxSegmentDurationSeconds: z.number().positive().optional(),
      pauseThresholdSeconds: z.number().positive().optional(),
      maxTokensPerSegment: z.number().positive().optional(),
    })
    .optional(),
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

    const { tokens, options } = validation.data;
    const segments = chunkTranscript(tokens, options);

    return NextResponse.json({ segments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
