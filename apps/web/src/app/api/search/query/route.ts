import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { searchSegments } from "@/lib/search/search-storage";

const requestSchema = z.object({
  queryText: z.string().min(1),
  queryEmbedding: z.array(z.number()).optional(),
  limit: z.number().positive().max(50).optional(),
  minQualityScore: z.number().min(0).max(1).optional(),
  ownerId: z.string().uuid().optional(),
  videoId: z.string().uuid().optional(),
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

    const results = await searchSegments(validation.data);
    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
