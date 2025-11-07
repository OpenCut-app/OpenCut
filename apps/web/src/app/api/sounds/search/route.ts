import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { baseRateLimit } from "@/lib/rate-limit";

const searchParamsSchema = z.object({
  q: z.string().max(500, "Query too long").optional(),
  type: z.enum(["songs", "effects"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  page_size: z.coerce.number().int().min(1).max(150).default(20),
  sort: z
    .enum(["downloads", "rating", "created", "score"])
    .default("downloads"),
  min_rating: z.coerce.number().min(0).max(5).default(3),
  commercial_only: z.coerce.boolean().default(true),
});

const freesoundResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  url: z.string().url(),
  previews: z
    .object({
      "preview-hq-mp3": z.string().url(),
      "preview-lq-mp3": z.string().url(),
      "preview-hq-ogg": z.string().url(),
      "preview-lq-ogg": z.string().url(),
    })
    .optional(),
  download: z.string().url().optional(),
  duration: z.number(),
  filesize: z.number(),
  type: z.string(),
  channels: z.number(),
  bitrate: z.number(),
  bitdepth: z.number(),
  samplerate: z.number(),
  username: z.string(),
  tags: z.array(z.string()),
  license: z.string(),
  created: z.string(),
  num_downloads: z.number().optional(),
  avg_rating: z.number().optional(),
  num_ratings: z.number().optional(),
});

const freesoundResponseSchema = z.object({
  count: z.number(),
  next: z.string().url().nullable(),
  previous: z.string().url().nullable(),
  results: z.array(freesoundResultSchema),
});

const transformedResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
  previewUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
  duration: z.number(),
  filesize: z.number(),
  type: z.string(),
  channels: z.number(),
  bitrate: z.number(),
  bitdepth: z.number(),
  samplerate: z.number(),
  username: z.string(),
  tags: z.array(z.string()),
  license: z.string(),
  created: z.string(),
  downloads: z.number().optional(),
  rating: z.number().optional(),
  ratingCount: z.number().optional(),
});

const apiResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(transformedResultSchema),
  query: z.string().optional(),
  type: z.string(),
  page: z.number(),
  pageSize: z.number(),
  sort: z.string(),
  minRating: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await baseRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);

    const validationResult = searchParamsSchema.safeParse({
      q: searchParams.get("q") || undefined,
      type: searchParams.get("type") || undefined,
      page: searchParams.get("page") || undefined,
      page_size: searchParams.get("page_size") || undefined,
      sort: searchParams.get("sort") || undefined,
      min_rating: searchParams.get("min_rating") || undefined,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      q: query,
      type,
      page,
      page_size: pageSize,
      sort,
      min_rating,
      commercial_only,
    } = validationResult.data;

    if (type === "songs") {
      return NextResponse.json(
        {
          error: "Songs are not available yet",
          message:
            "Song search functionality is coming soon. Try searching for sound effects instead.",
        },
        { status: 501 }
      );
    }

    const baseUrl = "https://freesound.org/apiv2/search/text/";

    // Use score sorting for search queries, downloads for top sounds
    const sortParam = query
      ? sort === "score"
        ? "score"
        : `${sort}_desc`
      : `${sort}_desc`;

    const params = new URLSearchParams({
      query: query || "",
      token: env.FREESOUND_API_KEY,
      page: page.toString(),
      page_size: pageSize.toString(),
      sort: sortParam,
      fields:
        "id,name,description,url,previews,download,duration,filesize,type,channels,bitrate,bitdepth,samplerate,username,tags,license,created,num_downloads,avg_rating,num_ratings",
    });

    // Always apply sound effect filters (since we're primarily a sound effects search)
    if (type === "effects" || !type) {
      params.append("filter", "duration:[* TO 30.0]");
      params.append("filter", `avg_rating:[${min_rating} TO *]`);

      // Filter by license if commercial_only is true
      if (commercial_only) {
        params.append(
          "filter",
          'license:("Attribution" OR "Creative Commons 0" OR "Attribution Noncommercial" OR "Attribution Commercial")'
        );
      }

      params.append(
        "filter",
        "tag:sound-effect OR tag:sfx OR tag:foley OR tag:ambient OR tag:nature OR tag:mechanical OR tag:electronic OR tag:impact OR tag:whoosh OR tag:explosion"
      );
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Freesound API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to search sounds" },
        { status: response.status }
      );
    }

    const rawData = await response.json();

    const freesoundValidation = freesoundResponseSchema.safeParse(rawData);
    if (!freesoundValidation.success) {
      console.error(
        "Invalid Freesound API response:",
        freesoundValidation.error
      );
      return NextResponse.json(
        { error: "Invalid response from Freesound API" },
        { status: 502 }
      );
    }

    const data = freesoundValidation.data;

    const transformedResults = data.results.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      url: result.url,
      previewUrl:
        result.previews?.["preview-hq-mp3"] ||
        result.previews?.["preview-lq-mp3"],
      downloadUrl: result.download,
      duration: result.duration,
      filesize: result.filesize,
      type: result.type,
      channels: result.channels,
      bitrate: result.bitrate,
      bitdepth: result.bitdepth,
      samplerate: result.samplerate,
      username: result.username,
      tags: result.tags,
      license: result.license,
      created: result.created,
      downloads: result.num_downloads || 0,
      rating: result.avg_rating || 0,
      ratingCount: result.num_ratings || 0,
    }));

    const responseData = {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: transformedResults,
      query: query || "",
      type: type || "effects",
      page,
      pageSize,
      sort,
      minRating: min_rating,
    };

    const responseValidation = apiResponseSchema.safeParse(responseData);
    if (!responseValidation.success) {
      console.error(
        "Invalid API response structure:",
        responseValidation.error
      );
      return NextResponse.json(
        { error: "Internal response formatting error" },
        { status: 500 }
      );
    }

    return NextResponse.json(responseValidation.data);
  } catch (error) {
    console.error("Error searching sounds:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
