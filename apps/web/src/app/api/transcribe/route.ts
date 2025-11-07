import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { baseRateLimit } from "@/lib/rate-limit";
import { isTranscriptionConfigured } from "@/lib/transcription-utils";

const transcribeRequestSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  language: z.string().optional().default("auto"),
  decryptionKey: z.string().min(1, "Decryption key is required").optional(),
  iv: z.string().min(1, "IV is required").optional(),
});

const modalResponseSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      id: z.number(),
      seek: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      tokens: z.array(z.number()),
      temperature: z.number(),
      avg_logprob: z.number(),
      compression_ratio: z.number(),
      no_speech_prob: z.number(),
    })
  ),
  language: z.string(),
});

const apiResponseSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      id: z.number(),
      seek: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      tokens: z.array(z.number()),
      temperature: z.number(),
      avg_logprob: z.number(),
      compression_ratio: z.number(),
      no_speech_prob: z.number(),
    })
  ),
  language: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await baseRateLimit.limit(ip);
    const origin = request.headers.get("origin");

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

    const validationResult = transcribeRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { filename, language, decryptionKey, iv } = validationResult.data;

    // Prepare request body for Modal
    const modalRequestBody: any = {
      filename,
      language,
    };

    // Add encryption parameters if provided (zero-knowledge)
    if (decryptionKey && iv) {
      modalRequestBody.decryptionKey = decryptionKey;
      modalRequestBody.iv = iv;
    }

    // Call Modal transcription service
    const response = await fetch(env.MODAL_TRANSCRIPTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(modalRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Modal API error:", response.status, errorText);

      let errorMessage = "Transcription service unavailable";
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Use default message if parsing fails
      }

      return NextResponse.json(
        {
          error: errorMessage,
          message: "Failed to process transcription request",
        },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    const rawResult = await response.json();
    console.log("Raw Modal response:", JSON.stringify(rawResult, null, 2));

    // Validate Modal response
    const modalValidation = modalResponseSchema.safeParse(rawResult);
    if (!modalValidation.success) {
      console.error("Invalid Modal API response:", modalValidation.error);
      return NextResponse.json(
        { error: "Invalid response from transcription service" },
        { status: 502 }
      );
    }

    const result = modalValidation.data;

    // Prepare and validate API response
    const responseData = {
      text: result.text,
      segments: result.segments,
      language: result.language,
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
    console.error("Transcription API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred during transcription",
      },
      { status: 500 }
    );
  }
}
