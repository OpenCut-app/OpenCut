import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeVideoSegment } from "@/lib/search/vlm-gemini";

const requestSchema = z.object({
  videoBase64: z.string().min(1),
  mimeType: z.string().min(1),
  segmentStartSeconds: z.number().nonnegative(),
  segmentEndSeconds: z.number().positive(),
  transcriptText: z.string().optional(),
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

    const result = await analyzeVideoSegment(validation.data);
    return NextResponse.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
