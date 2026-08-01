// apps/web/src/app/api/download-videos/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { spawn } from "child_process";

/**
 * Validates the request body for video URL.
 */
const infoRequestSchema = z.object({
  url: z.string().url("Invalid URL provided"),
});

/**
 * Validates the request body for search keyword.
 */
const searchRequestSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(50).optional().default(20),
});

/**
 * Handles POST requests to /api/download-videos with action parameter.
 * Supports: search, info, download
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "search":
        return await handleSearch(request);
      case "info":
        return await handleVideoInfo(request);
      case "download":
        return await handleDownload(request);
      default:
        return NextResponse.json(
          { error: "Invalid action. Use 'search', 'info', or 'download'." },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Video API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Handles video search using yt-dlp.
 * Searches videos based on keyword and pagination.
 */
async function handleSearch(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = searchRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { keyword, page, pageSize } = validationResult.data;
    const startIndex = (page - 1) * pageSize + 1;
    const endIndex = page * pageSize;

    return new Promise((resolve) => {
      const ytDlp = spawn("yt-dlp", [
        "--dump-single-json",
        "--flat-playlist",
        "--no-warnings",
        "--playlist-start",
        startIndex.toString(),
        "--playlist-end",
        endIndex.toString(),
        `ytsearch${pageSize}:${keyword}`,
      ]);

      let stdoutData = "";
      let stderrData = "";

      ytDlp.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      ytDlp.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      ytDlp.on("close", (code) => {
        try {
          if (code !== 0) {
            return resolve(
              NextResponse.json(
                {
                  success: false,
                  error: `yt-dlp process exited with code ${code}`,
                  details: stderrData,
                },
                { status: 500 }
              )
            );
          }

          if (!stdoutData.trim()) {
            return resolve(
              NextResponse.json(
                {
                  success: false,
                  error: "No output from yt-dlp",
                  details: stderrData || "Process completed with no output",
                },
                { status: 500 }
              )
            );
          }

          const result = JSON.parse(stdoutData);
          resolve(
            NextResponse.json({
              success: true,
              data: Array.isArray(result) ? result : [result],
            })
          );
        } catch (parseError) {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Error parsing yt-dlp output",
                details: parseError instanceof Error ? parseError.message : "Unknown error",
                rawOutput: stdoutData,
              },
              { status: 500 }
            )
          );
        }
      });

      ytDlp.on("error", (error) => {
        resolve(
          NextResponse.json(
            {
              success: false,
              error: "Failed to start yt-dlp process",
              details: error.message,
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Fetches video metadata using yt-dlp.
 * Returns title, duration, formats, thumbnails, etc.
 */
async function handleVideoInfo(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = infoRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;

    return new Promise((resolve) => {
      const ytDlp = spawn("yt-dlp", [
        "--dump-single-json",
        "--no-warnings",
        "--compat-options",
        "no-youtube-channel-redirect",
        url,
      ]);

      let stdoutData = "";
      let stderrData = "";

      ytDlp.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      ytDlp.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      ytDlp.on("close", (code) => {
        try {
          if (code !== 0) {
            return resolve(
              NextResponse.json(
                {
                  success: false,
                  error: `yt-dlp process exited with code ${code}`,
                  details: stderrData,
                },
                { status: 500 }
              )
            );
          }

          if (!stdoutData.trim()) {
            return resolve(
              NextResponse.json(
                {
                  success: false,
                  error: "No output from yt-dlp",
                  details: stderrData || "Process completed with no output",
                },
                { status: 500 }
              )
            );
          }

          const result = JSON.parse(stdoutData);
          resolve(
            NextResponse.json({
              success: true,
              data: result,
            })
          );
        } catch (parseError) {
          resolve(
            NextResponse.json(
              {
                success: false,
                error: "Error parsing yt-dlp output",
                details: parseError instanceof Error ? parseError.message : "Unknown error",
                rawOutput: stdoutData,
              },
              { status: 500 }
            )
          );
        }
      });

      ytDlp.on("error", (error) => {
        resolve(
          NextResponse.json(
            {
              success: false,
              error: "Failed to start yt-dlp process",
              details: error.message,
            },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Initiates video download process (placeholder).
 * In the future, this will spawn yt-dlp to download the video.
 *
 * @param request - Incoming NextRequest
 * @returns NextResponse with download status
 */
async function handleDownload(request: NextRequest) {
  try {
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = infoRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { url } = validationResult.data;

    // TODO: 实际调用 yt-dlp 下载视频文件
    // 当前返回模拟响应
    return NextResponse.json({
      success: true,
      message: "Download started (placeholder)",
      data: {
        url,
        status: "queued",
        downloadId: crypto.randomUUID(),
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
