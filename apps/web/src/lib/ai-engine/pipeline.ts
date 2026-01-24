import type {
  SourceVideo,
  PipelineConfiguration,
  PipelineStage,
} from "@/types/ai-engine";
import { useAiEngineStore } from "@/stores/ai-engine-store";
import { createChunksForAllVideos, annotateAllChunks } from "./chunking";
import { analyzeChunksInParallel } from "./analysis";
import { scoreAndPruneChunks } from "./scoring";
import { synthesizeTimeline } from "./synthesis";
import { refineAndExport } from "./refinement";

interface PipelineOptions {
  geminiApiKey?: string;
  skipRefinement?: boolean;
  abortSignal?: AbortSignal;
}

export const runPipeline = async (
  sourceVideos: SourceVideo[],
  configuration: PipelineConfiguration,
  options: PipelineOptions = {}
): Promise<void> => {
  const store = useAiEngineStore.getState();
  store.setIsProcessing(true);
  store.updatePipelineProgress({
    stage: "idle",
    overallProgress: 0,
    stageProgress: 0,
    currentMessage: "",
    errorMessage: undefined,
  });

  try {
    const checkAborted = () => {
      if (options.abortSignal?.aborted) {
        throw new Error("Pipeline aborted");
      }
    };

    updateProgress("chunking", 0, "Splitting videos into segments...");

    const chunks = createChunksForAllVideos(sourceVideos, {
      chunkDurationSeconds: configuration.chunkDurationSeconds,
      overlapSeconds: configuration.chunkOverlapSeconds,
    });

    store.setChunks(chunks);
    updateProgress("chunking", 1, `Created ${chunks.length} chunks`);

    checkAborted();
    updateProgress("analyzing", 0, "Preparing video elements...");

    const videoElements = await createVideoElements(sourceVideos);

    updateProgress("analyzing", 0.1, "Annotating chunks...");

    const annotations = await annotateAllChunks(
      chunks,
      videoElements,
      (completed, total) => {
        updateProgress(
          "analyzing",
          0.1 + (completed / total) * 0.3,
          `Annotating chunk ${completed}/${total}`
        );
      }
    );

    store.setAnnotations(annotations);

    checkAborted();
    updateProgress("analyzing", 0.4, "Running AI analysis...");

    const analyses = await analyzeChunksInParallel(
      chunks,
      annotations,
      videoElements,
      {
        useServerRoute: !options.geminiApiKey,
        geminiApiKey: options.geminiApiKey,
        concurrencyLimit: 4,
      },
      (completed, total) => {
        updateProgress(
          "analyzing",
          0.4 + (completed / total) * 0.6,
          `Analyzing chunk ${completed}/${total}`
        );
      }
    );

    store.setAnalyses(analyses);
    cleanupVideoElements(videoElements);

    checkAborted();
    updateProgress("scoring", 0, "Scoring and selecting best segments...");

    const scoringResult = scoreAndPruneChunks(
      chunks,
      analyses,
      configuration.scoringWeights,
      configuration.pruningConstraints
    );

    store.setScores(scoringResult.scores);
    updateProgress(
      "scoring",
      1,
      `Selected ${scoringResult.selectedChunkIds.length} segments (${Math.round(scoringResult.totalSelectedDuration)}s)`
    );

    checkAborted();
    updateProgress("synthesizing", 0, "Building edit timeline...");

    const timeline = synthesizeTimeline(chunks, analyses, scoringResult.scores, {
      targetDurationSeconds: configuration.targetDurationSeconds,
    });

    store.setSynthesizedTimeline(timeline);
    updateProgress(
      "synthesizing",
      1,
      `Timeline built: ${Math.round(timeline.totalDuration)}s with ${timeline.segments.length} segments`
    );

    checkAborted();

    if (options.skipRefinement) {
      updateProgress("complete", 1, "Pipeline complete (skipped refinement)");
      store.setIsProcessing(false);
      return;
    }

    updateProgress("refining", 0, "Refining and rendering output...");

    const allTranscripts = analyses.flatMap(
      (analysis) => analysis.transcript
    );

    const refinementResult = await refineAndExport(
      timeline,
      sourceVideos,
      allTranscripts,
      configuration.refinementSettings,
      (stage, progress) => {
        updateProgress("refining", progress, `Refining: ${stage}...`);
      },
      options.abortSignal
    );

    store.setOutputUrl(refinementResult.outputUrl);

    updateProgress("complete", 1, "Video generation complete!");
    store.setIsProcessing(false);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Pipeline failed";
    updateProgress("error", 0, errorMessage);
    store.setIsProcessing(false);
    throw error;
  }
};

const updateProgress = (
  stage: PipelineStage,
  stageProgress: number,
  message: string
): void => {
  const stageWeights: Record<PipelineStage, { start: number; weight: number }> = {
    idle: { start: 0, weight: 0 },
    uploading: { start: 0, weight: 0.05 },
    normalizing: { start: 0.05, weight: 0.05 },
    chunking: { start: 0.1, weight: 0.05 },
    analyzing: { start: 0.15, weight: 0.35 },
    scoring: { start: 0.5, weight: 0.05 },
    synthesizing: { start: 0.55, weight: 0.05 },
    refining: { start: 0.6, weight: 0.35 },
    exporting: { start: 0.95, weight: 0.05 },
    complete: { start: 1, weight: 0 },
    error: { start: 0, weight: 0 },
  };

  const stageInfo = stageWeights[stage];
  const overallProgress = stageInfo.start + stageProgress * stageInfo.weight;

  useAiEngineStore.getState().updatePipelineProgress({
    stage,
    stageProgress,
    overallProgress: Math.min(1, overallProgress),
    currentMessage: message,
    errorMessage: stage === "error" ? message : undefined,
  });
};

const createVideoElements = async (
  sourceVideos: SourceVideo[]
): Promise<Map<string, HTMLVideoElement>> => {
  const elements = new Map<string, HTMLVideoElement>();

  for (const video of sourceVideos) {
    const videoElement = document.createElement("video");
    videoElement.src = video.url;
    videoElement.crossOrigin = "anonymous";
    videoElement.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      videoElement.addEventListener("loadeddata", () => resolve());
      videoElement.addEventListener("error", () =>
        reject(new Error(`Failed to load video: ${video.name}`))
      );
      videoElement.load();
    });

    elements.set(video.id, videoElement);
  }

  return elements;
};

const cleanupVideoElements = (
  elements: Map<string, HTMLVideoElement>
): void => {
  for (const element of elements.values()) {
    element.pause();
    element.src = "";
    element.remove();
  }
  elements.clear();
};
