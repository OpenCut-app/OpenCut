import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AwsClient } from "aws4fetch";
import { nanoid } from "nanoid";
import { env } from "@/env";
import { baseRateLimit } from "@/lib/rate-limit";
import { isTranscriptionConfigured } from "@/lib/transcription-utils";

const uploadRequestSchema = z.object({
  fileExtension: z.enum(["wav", "mp3", "m4a", "flac"], {
    errorMap: () => ({
      message: "File extension must be wav, mp3, m4a, or flac",
    }),
  }),
});

const apiResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileName: z.string().min(1),
});

/**
 * Generates a presigned upload URL and a unique filename for uploading an audio file to Cloudflare R2.
 *
 * Accepts a JSON request body with a `fileExtension` (one of "wav", "mp3", "m4a", "flac"). Applies client rate limiting and verifies required transcription environment configuration before producing a signed PUT URL valid for 1 hour.
 *
 * @param request - Incoming Next.js request whose JSON body must include `fileExtension`
 * @returns On success, an object with `uploadUrl` (the presigned PUT URL) and `fileName` (the generated object path). On failure, a JSON error object with an `error` field and optional `message`/`details`; responses use appropriate HTTP status codes (400, 429, 503, 500).
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await baseRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Check transcription configuration
    const transcriptionCheck = isTranscriptionConfigured();
    if (!transcriptionCheck.configured) {
      console.error(
        "Missing environment variables:",
        JSON.stringify(transcriptionCheck.missingVars)
      );

      return NextResponse.json(
        {
          error: "Transcription not configured",
          message: `Auto-captions require environment variables: ${transcriptionCheck.missingVars.join(", ")}. Check README for setup instructions.`,
        },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = uploadRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fileExtension } = validationResult.data;

    // Initialize R2 client
    const client = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `audio/${timestamp}-${nanoid()}.${fileExtension}`;

    // Create presigned URL
    const url = new URL(
      `https://${env.R2_BUCKET_NAME}.${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`
    );

    url.searchParams.set("X-Amz-Expires", "3600"); // 1 hour expiry

    const signed = await client.sign(new Request(url, { method: "PUT" }), {
      aws: { signQuery: true },
    });

    if (!signed.url) {
      throw new Error("Failed to generate presigned URL");
    }

    // Prepare and validate response
    const responseData = {
      uploadUrl: signed.url,
      fileName,
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
    console.error("Error generating upload URL:", error);
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}