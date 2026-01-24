import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const analyzeRequestSchema = z.object({
  frameData: z.string().min(1, "Frame data is required"),
  chunkDuration: z.number().positive(),
  chunkStartTime: z.number().min(0),
  chunkEndTime: z.number().positive(),
  annotationContext: z.string().optional(),
});

const geminiResponseSchema = z.object({
  transcript: z
    .array(
      z.object({
        text: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        confidence: z.number(),
      })
    )
    .optional()
    .default([]),
  topics: z
    .array(
      z.object({
        label: z.string(),
        relevanceScore: z.number(),
        startTime: z.number(),
        endTime: z.number(),
      })
    )
    .optional()
    .default([]),
  emotion: z
    .enum([
      "neutral",
      "excited",
      "serious",
      "humorous",
      "inspirational",
      "informative",
    ])
    .optional()
    .default("neutral"),
  energyScore: z.number().min(0).max(1).optional().default(0.5),
  visualQuality: z.number().min(0).max(1).optional().default(0.5),
  speakingConfidence: z.number().min(0).max(1).optional().default(0.5),
  sceneType: z
    .enum([
      "talking-head",
      "b-roll",
      "screen-capture",
      "interview",
      "transition",
      "unknown",
    ])
    .optional()
    .default("unknown"),
  isFiller: z.boolean().optional().default(false),
  hasSilence: z.boolean().optional().default(false),
  keywords: z.array(z.string()).optional().default([]),
});

export const POST = async (request: NextRequest) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key not configured",
          message:
            "Set GEMINI_API_KEY environment variable to enable AI analysis",
        },
        { status: 503 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validationResult = analyzeRequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { frameData, chunkDuration, chunkStartTime, chunkEndTime, annotationContext } =
      validationResult.data;

    const prompt = buildGeminiPrompt(
      chunkDuration,
      chunkStartTime,
      chunkEndTime,
      annotationContext
    );

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: frameData,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return NextResponse.json(
        { error: "AI analysis service unavailable" },
        { status: 502 }
      );
    }

    const responseData = await geminiResponse.json();
    const analysisText =
      responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsedAnalysis: unknown;
    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 502 }
      );
    }

    const analysisValidation = geminiResponseSchema.safeParse(parsedAnalysis);
    if (!analysisValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid AI response format",
          fallback: {
            transcript: [],
            topics: [],
            emotion: "neutral",
            energyScore: 0.5,
            visualQuality: 0.5,
            speakingConfidence: 0.5,
            sceneType: "unknown",
            isFiller: false,
            hasSilence: false,
            keywords: [],
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(analysisValidation.data);
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

const buildGeminiPrompt = (
  chunkDuration: number,
  chunkStartTime: number,
  chunkEndTime: number,
  annotationContext?: string
): string => {
  const contextLine = annotationContext
    ? `Additional context: ${annotationContext}`
    : "";

  return `Analyze this video frame from a ${chunkDuration.toFixed(1)}s segment (${chunkStartTime.toFixed(1)}s - ${chunkEndTime.toFixed(1)}s). ${contextLine}

Return JSON with these fields:
- transcript: array of {text, startTime, endTime, confidence} for any speech detected
- topics: array of {label, relevanceScore (0-1), startTime, endTime} for semantic topics
- emotion: one of "neutral", "excited", "serious", "humorous", "inspirational", "informative"
- energyScore: 0-1 how energetic/engaging this segment appears
- visualQuality: 0-1 visual quality (sharpness, exposure, composition)
- speakingConfidence: 0-1 confidence someone is speaking clearly
- sceneType: one of "talking-head", "b-roll", "screen-capture", "interview", "transition", "unknown"
- isFiller: boolean if this is filler/rambling content
- hasSilence: boolean if mostly silent
- keywords: array of relevant keywords/phrases`;
};
