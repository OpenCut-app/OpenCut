import { z } from "zod";
import type { SegmentVisualContext } from "@/types/semantic-search";

interface VideoAnalysisRequest {
  videoBase64: string;
  mimeType: string;
  segmentStartSeconds: number;
  segmentEndSeconds: number;
  transcriptText?: string;
}

const responseSchema = z.object({
  visualSummary: z.string().optional().default(""),
  visualTags: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  qualityScore: z.number().min(0).max(1).optional(),
});

const buildPrompt = ({
  segmentStartSeconds,
  segmentEndSeconds,
  transcriptText,
}: {
  segmentStartSeconds: number;
  segmentEndSeconds: number;
  transcriptText?: string;
}): string => {
  const transcriptLine = transcriptText
    ? `Transcript context: ${transcriptText}`
    : "";

  return `Analyze this video segment (${segmentStartSeconds.toFixed(2)}s - ${segmentEndSeconds.toFixed(2)}s).
Return JSON with:
- visualSummary (short, descriptive)
- visualTags (array of objects/scene/action tags)
- keywords (array of key terms)
- qualityScore (0-1, overall visual quality)
${transcriptLine}`;
};

const analyzeVideoSegment = async (
  request: VideoAnalysisRequest
): Promise<SegmentVisualContext> => {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = buildPrompt(request);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
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
                  mime_type: request.mimeType,
                  data: request.videoBase64,
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini analysis failed: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  const analysisText =
    responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  let parsedAnalysis: unknown;
  try {
    parsedAnalysis = JSON.parse(analysisText);
  } catch {
    parsedAnalysis = {};
  }

  const validation = responseSchema.safeParse(parsedAnalysis);
  if (!validation.success) {
    return {
      visualSummary: "",
      visualTags: [],
      keywords: [],
      qualityScore: undefined,
    };
  }

  return {
    visualSummary: validation.data.visualSummary,
    visualTags: validation.data.visualTags,
    keywords: validation.data.keywords,
    qualityScore: validation.data.qualityScore,
  };
};

export type { VideoAnalysisRequest };
export { analyzeVideoSegment };
