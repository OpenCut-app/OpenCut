import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { baseRateLimit } from "@/lib/rate-limit";
import { isTranscriptionConfigured } from "@/lib/transcription-utils";

export const runtime = "nodejs";

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

interface NormalizedSegment {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

const geminiTranscriptSchema = z.object({
  language: z.string().optional().default("unknown"),
  text: z.string().optional().default(""),
  segments: z
    .array(
      z.object({
        start: z.coerce.number().optional(),
        end: z.coerce.number().optional(),
        text: z.string().optional().default(""),
        avg_logprob: z.coerce.number().optional(),
      }),
    )
    .optional()
    .default([]),
});

const apiResponseSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      id: z.number(),
      start: z.number(),
      end: z.number(),
      text: z.string(),
      avg_logprob: z.number().optional(),
    }),
  ),
  language: z.string(),
});

const normalizeWhitespace = (input: string) => input.replace(/\s+/g, " ").trim();

const readAscii = (view: DataView, offset: number, length: number) => {
  let out = "";
  for (let index = 0; index < length; index++) {
    out += String.fromCharCode(view.getUint8(offset + index));
  }
  return out;
};

const getWavDurationSeconds = (wavBytes: ArrayBuffer): number | null => {
  const view = new DataView(wavBytes);
  if (view.byteLength < 44) return null;

  if (readAscii(view, 0, 4) !== "RIFF") return null;
  if (readAscii(view, 8, 4) !== "WAVE") return null;

  let offset = 12;
  let byteRate: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readAscii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkDataOffset = offset + 8;

    if (
      chunkId === "fmt " &&
      chunkSize >= 16 &&
      chunkDataOffset + 16 <= view.byteLength
    ) {
      byteRate = view.getUint32(chunkDataOffset + 8, true);
    }

    if (chunkId === "data") {
      dataSize = chunkSize;
      break;
    }

    offset = chunkDataOffset + chunkSize;
    if (chunkSize % 2 === 1) offset += 1;
  }

  if (!byteRate || !dataSize || byteRate <= 0) return null;
  const duration = dataSize / byteRate;
  return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const normalizeSegments = ({
  rawSegments,
  fallbackText,
  audioDurationSeconds,
}: {
  rawSegments: Array<z.infer<typeof geminiTranscriptSchema>["segments"][number]>;
  fallbackText: string;
  audioDurationSeconds: number | null;
}): NormalizedSegment[] => {
  const cleaned = rawSegments
    .map((segment) => {
      const text = normalizeWhitespace(segment.text ?? "");
      const start = Number.isFinite(segment.start as number)
        ? (segment.start as number)
        : null;
      const end = Number.isFinite(segment.end as number)
        ? (segment.end as number)
        : null;
      const avg_logprob = Number.isFinite(segment.avg_logprob as number)
        ? (segment.avg_logprob as number)
        : undefined;

      return { text, start, end, avg_logprob };
    })
    .filter((segment) => segment.text.length > 0);

  const duration =
    audioDurationSeconds && audioDurationSeconds > 0 ? audioDurationSeconds : null;

  const withTimes = cleaned.filter(
    (segment) =>
      segment.start !== null &&
      segment.end !== null &&
      segment.start >= 0 &&
      segment.end > segment.start,
  );

  if (withTimes.length > 0) {
    const sorted = [...withTimes].sort(
      (left, right) => (left.start as number) - (right.start as number),
    );

    const normalized: NormalizedSegment[] = [];
    let previousEnd = 0;

    for (const segment of sorted) {
      let start = Math.max(segment.start as number, previousEnd);
      let end = segment.end as number;

      if (duration !== null) {
        start = Math.min(start, duration);
        end = Math.min(end, duration);
      }

      if (end <= start) end = start + 0.25;

      normalized.push({
        start,
        end,
        text: segment.text,
        ...(segment.avg_logprob === undefined
          ? {}
          : { avg_logprob: segment.avg_logprob }),
      });

      previousEnd = end;
    }

    return normalized.filter(
      (segment) =>
        Number.isFinite(segment.start) &&
        Number.isFinite(segment.end) &&
        segment.end > segment.start,
    );
  }

  const text = normalizeWhitespace(fallbackText);
  if (!duration) {
    return text.length > 0 ? [{ start: 0, end: 1, text }] : [];
  }

  const pieces = cleaned.length > 0 ? cleaned.map((segment) => segment.text) : [text];
  const wordCounts = pieces.map((piece) => Math.max(1, piece.split(/\s+/).length));
  const totalWords = wordCounts.reduce((sum, count) => sum + count, 0);

  let cursor = 0;
  const normalized: NormalizedSegment[] = pieces.map((piece, index) => {
    const share = wordCounts[index] / totalWords;
    const segmentDuration = Math.max(0.25, duration * share);
    const start = cursor;
    const end =
      index === pieces.length - 1
        ? duration
        : Math.min(duration, cursor + segmentDuration);
    cursor = end;
    return { start, end, text: piece };
  });

  return normalized.filter(
    (segment) =>
      Number.isFinite(segment.start) &&
      Number.isFinite(segment.end) &&
      segment.end > segment.start,
  );
};

export const POST = async (request: NextRequest) => {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await baseRateLimit.limit(ip);

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const transcriptionCheck = isTranscriptionConfigured();
    if (!transcriptionCheck.configured) {
      return NextResponse.json(
        {
          error: "Transcription not configured",
          message: `Auto-captions require environment variables: ${transcriptionCheck.missingVars.join(", ")}.`,
        },
        { status: 503 },
      );
    }

    const geminiApiKey = env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key not configured",
          message: "Set GEMINI_API_KEY environment variable to enable captions",
        },
        { status: 503 },
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "Invalid form data in request body" },
        { status: 400 },
      );
    }

    const audioEntry = formData.get("audio");
    if (!audioEntry || typeof audioEntry === "string") {
      return NextResponse.json(
        {
          error: "Missing audio file",
          message: "Send multipart/form-data with an 'audio' file.",
        },
        { status: 400 },
      );
    }

    const languageEntry = formData.get("language");
    const language =
      typeof languageEntry === "string" && languageEntry.trim().length > 0
        ? languageEntry.trim()
        : "auto";

    const audioBlob = audioEntry;
    const audioBytes = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioBytes).toString("base64");
    const audioMimeType = audioBlob.type || "audio/wav";
    const audioDurationSeconds = audioMimeType.includes("wav")
      ? getWavDurationSeconds(audioBytes)
      : null;

    const prompt = `Transcribe this audio into plain text.

Return ONLY valid JSON with this exact shape:
{
  "language": string,
  "text": string,
  "segments": [
    { "start": number, "end": number, "text": string }
  ]
}

Rules:
- "start" and "end" are seconds from the start of the audio.
- Make segments short (1-2 sentences each) and in chronological order.
- If a language is provided ("${language}"), use it; otherwise auto-detect.`;

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
                    mime_type: audioMimeType,
                    data: audioBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return NextResponse.json(
        { error: "Transcription service unavailable" },
        { status: 502 },
      );
    }

    const responseData = await geminiResponse.json();
    const transcriptText =
      responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsedTranscript: unknown;
    try {
      parsedTranscript = JSON.parse(transcriptText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse transcription response" },
        { status: 502 },
      );
    }

    const validation = geminiTranscriptSchema.safeParse(parsedTranscript);
    if (!validation.success) {
      console.error("Invalid Gemini transcription format:", validation.error);
      return NextResponse.json(
        { error: "Invalid response from transcription service" },
        { status: 502 },
      );
    }

    const normalizedText = normalizeWhitespace(validation.data.text);
    const fallbackText =
      normalizedText.length > 0
        ? normalizedText
        : normalizeWhitespace(
            validation.data.segments.map((segment) => segment.text).join(" "),
          );

    const segments: TranscriptionSegment[] = normalizeSegments({
      rawSegments: validation.data.segments,
      fallbackText,
      audioDurationSeconds,
    }).map((segment, index) => ({
      id: index,
      start: segment.start,
      end: segment.end,
      text: segment.text,
      ...(segment.avg_logprob === undefined
        ? {}
        : { avg_logprob: segment.avg_logprob }),
    }));

    const apiPayload = {
      text: fallbackText,
      segments,
      language: validation.data.language || "unknown",
    };

    const responseValidation = apiResponseSchema.safeParse(apiPayload);
    if (!responseValidation.success) {
      console.error("Invalid API response structure:", responseValidation.error);
      return NextResponse.json(
        { error: "Internal response formatting error" },
        { status: 500 },
      );
    }

    return NextResponse.json(responseValidation.data);
  } catch (error) {
    console.error("Transcription API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
