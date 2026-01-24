import type {
  VideoChunk,
  ChunkAnalysis,
  TranscriptSegment,
  SemanticTopic,
  SceneType,
  EmotionCategory,
  ChunkAnnotation,
} from "@/types/ai-engine";

interface AnalysisOptions {
  concurrencyLimit: number;
  geminiApiKey?: string;
  useServerRoute: boolean;
  modelId?: string;
}

interface GeminiAnalysisResponse {
  transcript: TranscriptSegment[];
  topics: SemanticTopic[];
  emotion: EmotionCategory;
  energyScore: number;
  visualQuality: number;
  speakingConfidence: number;
  sceneType: SceneType;
  isFiller: boolean;
  hasSilence: boolean;
  keywords: string[];
}

const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  concurrencyLimit: 4,
  useServerRoute: true,
};

export const analyzeChunksInParallel = async (
  chunks: VideoChunk[],
  annotations: ChunkAnnotation[],
  videoElements: Map<string, HTMLVideoElement>,
  options: Partial<AnalysisOptions> = {},
  onProgress?: (completed: number, total: number) => void
): Promise<ChunkAnalysis[]> => {
  const mergedOptions = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const { concurrencyLimit } = mergedOptions;

  const analyses: ChunkAnalysis[] = [];
  const annotationMap = new Map(
    annotations.map((annotation) => [annotation.chunkId, annotation])
  );

  const batchedChunks = createBatches(chunks, concurrencyLimit);

  for (const batch of batchedChunks) {
    const batchResults = await Promise.all(
      batch.map((chunk) =>
        analyzeChunk(
          chunk,
          annotationMap.get(chunk.id),
          videoElements.get(chunk.sourceVideoId),
          mergedOptions
        )
      )
    );

    analyses.push(...batchResults);

    if (onProgress) {
      onProgress(analyses.length, chunks.length);
    }
  }

  return analyses;
};

const analyzeChunk = async (
  chunk: VideoChunk,
  annotation: ChunkAnnotation | undefined,
  videoElement: HTMLVideoElement | undefined,
  options: AnalysisOptions
): Promise<ChunkAnalysis> => {
  if (options.useServerRoute && videoElement) {
    try {
      return await analyzeViaServerRoute(chunk, annotation, videoElement);
    } catch (error) {
      console.error("Server analysis failed for chunk:", chunk.id, error);
      return createHeuristicAnalysis(chunk, annotation);
    }
  }

  if (options.geminiApiKey && videoElement) {
    try {
      return await analyzeWithGemini(chunk, annotation, videoElement, options);
    } catch (error) {
      console.error("Gemini analysis failed for chunk:", chunk.id, error);
      return createHeuristicAnalysis(chunk, annotation);
    }
  }

  return createHeuristicAnalysis(chunk, annotation);
};

const analyzeViaServerRoute = async (
  chunk: VideoChunk,
  annotation: ChunkAnnotation | undefined,
  videoElement: HTMLVideoElement
): Promise<ChunkAnalysis> => {
  const frameDataUrl = await extractFrameAsDataUrl(
    videoElement,
    chunk.startTime + chunk.duration / 2
  );

  const base64Data = frameDataUrl.split(",")[1];

  const annotationContext = annotation
    ? `brightness=${annotation.visualStats.averageBrightness.toFixed(2)}, blur=${annotation.visualStats.blurScore.toFixed(2)}, face=${annotation.visualStats.faceDetected}, volume=${annotation.audioStats.averageVolume.toFixed(2)}, silence=${annotation.audioStats.silenceRatio.toFixed(2)}`
    : undefined;

  const response = await fetch("/api/ai-engine/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      frameData: base64Data,
      chunkDuration: chunk.duration,
      chunkStartTime: chunk.startTime,
      chunkEndTime: chunk.endTime,
      annotationContext,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server analysis error: ${response.status}`);
  }

  const responseBody = await response.json();
  const parsedAnalysis: GeminiAnalysisResponse = responseBody.fallback || responseBody;

  return {
    chunkId: chunk.id,
    transcript: parsedAnalysis.transcript || [],
    semanticTopics: parsedAnalysis.topics || [],
    emotionCategory: parsedAnalysis.emotion || "neutral",
    energyScore: clampScore(parsedAnalysis.energyScore),
    visualQualityScore: clampScore(parsedAnalysis.visualQuality),
    speakingConfidence: clampScore(parsedAnalysis.speakingConfidence),
    sceneType: parsedAnalysis.sceneType || "unknown",
    isFillerContent: parsedAnalysis.isFiller || false,
    hasSilence: parsedAnalysis.hasSilence || false,
    keywords: parsedAnalysis.keywords || [],
  };
};

const analyzeWithGemini = async (
  chunk: VideoChunk,
  annotation: ChunkAnnotation | undefined,
  videoElement: HTMLVideoElement,
  options: AnalysisOptions
): Promise<ChunkAnalysis> => {
  const frameDataUrl = await extractFrameAsDataUrl(
    videoElement,
    chunk.startTime + chunk.duration / 2
  );

  const prompt = buildAnalysisPrompt(chunk, annotation);

  const modelId = options.modelId || "gemini-2.0-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${options.geminiApiKey}`,
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
                  data: frameDataUrl.split(",")[1],
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
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const responseData = await response.json();
  const analysisText =
    responseData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsedAnalysis: GeminiAnalysisResponse = JSON.parse(analysisText);

  return {
    chunkId: chunk.id,
    transcript: parsedAnalysis.transcript || [],
    semanticTopics: parsedAnalysis.topics || [],
    emotionCategory: parsedAnalysis.emotion || "neutral",
    energyScore: clampScore(parsedAnalysis.energyScore),
    visualQualityScore: clampScore(parsedAnalysis.visualQuality),
    speakingConfidence: clampScore(parsedAnalysis.speakingConfidence),
    sceneType: parsedAnalysis.sceneType || "unknown",
    isFillerContent: parsedAnalysis.isFiller || false,
    hasSilence: parsedAnalysis.hasSilence || false,
    keywords: parsedAnalysis.keywords || [],
  };
};

const createHeuristicAnalysis = (
  chunk: VideoChunk,
  annotation: ChunkAnnotation | undefined
): ChunkAnalysis => {
  const visualQuality = annotation
    ? calculateVisualQuality(annotation)
    : 0.5;

  const hasSilence = annotation
    ? annotation.audioStats.silenceRatio > 0.6
    : false;

  const energyScore = annotation
    ? calculateEnergyFromAnnotation(annotation)
    : 0.5;

  const sceneType = annotation
    ? inferSceneType(annotation)
    : "unknown";

  return {
    chunkId: chunk.id,
    transcript: [],
    semanticTopics: [],
    emotionCategory: "neutral",
    energyScore,
    visualQualityScore: visualQuality,
    speakingConfidence: hasSilence ? 0.2 : 0.6,
    sceneType,
    isFillerContent: hasSilence && energyScore < 0.3,
    hasSilence,
    keywords: [],
  };
};

const buildAnalysisPrompt = (
  chunk: VideoChunk,
  annotation: ChunkAnnotation | undefined
): string => {
  const annotationContext = annotation
    ? `Visual stats: brightness=${annotation.visualStats.averageBrightness.toFixed(2)}, blur=${annotation.visualStats.blurScore.toFixed(2)}, face=${annotation.visualStats.faceDetected}. Audio stats: volume=${annotation.audioStats.averageVolume.toFixed(2)}, silence=${annotation.audioStats.silenceRatio.toFixed(2)}.`
    : "";

  return `Analyze this video frame from a ${chunk.duration.toFixed(1)}s segment (${chunk.startTime.toFixed(1)}s - ${chunk.endTime.toFixed(1)}s). ${annotationContext}

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

const extractFrameAsDataUrl = (
  videoElement: HTMLVideoElement,
  timeSeconds: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      reject(new Error("Cannot get canvas context"));
      return;
    }

    const sourceWidth = videoElement.videoWidth || 640;
    const sourceHeight = videoElement.videoHeight || 480;
    const maxWidth = 640;
    const scaleFactor = Math.min(1, maxWidth / sourceWidth);

    canvas.width = Math.round(sourceWidth * scaleFactor);
    canvas.height = Math.round(sourceHeight * scaleFactor);

    const handleSeeked = () => {
      videoElement.removeEventListener("seeked", handleSeeked);
      context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      canvas.remove();
      resolve(dataUrl);
    };

    videoElement.addEventListener("seeked", handleSeeked);
    videoElement.currentTime = timeSeconds;
  });
};

const calculateVisualQuality = (annotation: ChunkAnnotation): number => {
  const { averageBrightness, blurScore } = annotation.visualStats;
  const brightnessScore =
    1 - Math.abs(averageBrightness - 0.5) * 2;
  const sharpnessScore = 1 - blurScore;
  return (brightnessScore * 0.4 + sharpnessScore * 0.6);
};

const calculateEnergyFromAnnotation = (
  annotation: ChunkAnnotation
): number => {
  const { averageVolume, silenceRatio } = annotation.audioStats;
  const { motionIntensity } = annotation.visualStats;
  return (averageVolume * 0.4 + (1 - silenceRatio) * 0.3 + motionIntensity * 0.3);
};

const inferSceneType = (annotation: ChunkAnnotation): SceneType => {
  if (annotation.visualStats.faceDetected) {
    return "talking-head";
  }
  if (annotation.audioStats.silenceRatio > 0.8) {
    return "b-roll";
  }
  return "unknown";
};

const clampScore = (value: number | undefined): number => {
  if (value === undefined || isNaN(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
};

const createBatches = <T>(items: T[], batchSize: number): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
};
