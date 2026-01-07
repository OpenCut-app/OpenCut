import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";

const querySchema = z.object({
  query: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(150).default(20),
  sort: z
    .enum(["relevance", "duration", "downloads", "rating", "created"])
    .default("relevance"),
});

function isFreesoundConfigured() {
  return Boolean(env.FREESOUND_API_KEY);
}

export async function GET(request: NextRequest) {
  try {
    // If Freesound isn't configured, disable this endpoint cleanly.
    if (!isFreesoundConfigured()) {
      return NextResponse.json(
        {
          error: "Freesound not configured",
          message:
            "This endpoint requires FREESOUND_API_KEY. Set it (and FREESOUND_CLIENT_ID if needed) to enable sound search.",
        },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      query: url.searchParams.get("query") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      page_size: url.searchParams.get("page_size") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { query, page, page_size, sort } = parsed.data;

    // Freesound sort mapping (matches previous logic style)
    const sortParam =
      sort === "relevance"
        ? "score"
        : sort === "created"
          ? "created"
          : `${sort}_desc`;

    // ✅ token must be string; we already guarded above.
    const token = env.FREESOUND_API_KEY as string;

    const params = new URLSearchParams({
      query: query || "",
      token,
      page: page.toString(),
      page_size: page_size.toString(),
      sort: sortParam,
      fields:
        "id,name,previews,username,license,created,description,duration,download,downloads,avg_rating,num_ratings,tags,images,url",
    });

    const response = await fetch(
      `https://freesound.org/apiv2/search/text/?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        // avoid caching in builds/edge contexts
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Freesound request failed",
          status: response.status,
          details: text || response.statusText,
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in sounds search route:", error);
    return NextResponse.json(
      {
        error: "Internal error",
        message:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}