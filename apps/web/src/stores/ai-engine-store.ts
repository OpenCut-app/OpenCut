import { create } from "zustand";
import { generateUUID } from "@/lib/utils";
import type {
  SourceVideo,
  VideoChunk,
  ChunkAnnotation,
  ChunkAnalysis,
  ChunkScore,
  SynthesizedTimeline,
  PipelineStage,
  PipelineProgress,
  PipelineConfiguration,
  AiEngineProject,
} from "@/types/ai-engine";

interface AiEngineStore {
  project: AiEngineProject | null;
  isProcessing: boolean;

  initializeProject: (name: string) => void;
  addSourceVideo: (video: Omit<SourceVideo, "id">) => void;
  removeSourceVideo: (videoId: string) => void;
  setChunks: (chunks: VideoChunk[]) => void;
  setAnnotations: (annotations: ChunkAnnotation[]) => void;
  setAnalyses: (analyses: ChunkAnalysis[]) => void;
  setScores: (scores: ChunkScore[]) => void;
  setSynthesizedTimeline: (timeline: SynthesizedTimeline) => void;
  updatePipelineProgress: (progress: Partial<PipelineProgress>) => void;
  updateConfiguration: (config: Partial<PipelineConfiguration>) => void;
  setOutputUrl: (url: string) => void;
  setIsProcessing: (processing: boolean) => void;
  resetProject: () => void;
}

const DEFAULT_CONFIGURATION: PipelineConfiguration = {
  chunkDurationSeconds: 4,
  chunkOverlapSeconds: 1,
  scoringWeights: {
    relevance: 0.35,
    quality: 0.25,
    narrativeContinuity: 0.25,
    energyBoost: 0.1,
    hookBonus: 0.05,
  },
  pruningConstraints: {
    minimumCoreIdeas: 1,
    maximumNarrativeGap: 3,
    minimumOutputDuration: 30,
    maximumOutputDuration: 90,
    avoidAbruptJumps: true,
  },
  refinementSettings: {
    reframe: {
      targetAspectRatio: "9:16",
      subjectTracking: true,
      safeZoneMargin: 0.1,
    },
    audioCleanup: {
      noiseReduction: true,
      fillerWordRemoval: true,
      loudnessNormalization: true,
      targetLufs: -14,
      compressionEnabled: true,
    },
    exportPreset: {
      name: "TikTok/Reels",
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 8000000,
      codec: "h264",
      format: "mp4",
    },
    captionsEnabled: true,
    captionStyle: {
      fontFamily: "Inter",
      fontSize: 32,
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      position: "bottom",
      highlightKeywords: true,
    },
  },
  targetDurationSeconds: 60,
};

const DEFAULT_PROGRESS: PipelineProgress = {
  stage: "idle",
  overallProgress: 0,
  stageProgress: 0,
  currentMessage: "",
};

export const useAiEngineStore = create<AiEngineStore>((set, get) => ({
  project: null,
  isProcessing: false,

  initializeProject: (name) => {
    const project: AiEngineProject = {
      id: generateUUID(),
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceVideos: [],
      chunks: [],
      annotations: [],
      analyses: [],
      scores: [],
      pipelineProgress: { ...DEFAULT_PROGRESS },
      configuration: { ...DEFAULT_CONFIGURATION },
    };
    set({ project });
  },

  addSourceVideo: (video) => {
    const currentProject = get().project;
    if (!currentProject) return;

    const newVideo: SourceVideo = {
      ...video,
      id: generateUUID(),
    };

    set({
      project: {
        ...currentProject,
        sourceVideos: [...currentProject.sourceVideos, newVideo],
        updatedAt: new Date().toISOString(),
      },
    });
  },

  removeSourceVideo: (videoId) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        sourceVideos: currentProject.sourceVideos.filter(
          (video) => video.id !== videoId
        ),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setChunks: (chunks) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        chunks,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setAnnotations: (annotations) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        annotations,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setAnalyses: (analyses) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        analyses,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setScores: (scores) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        scores,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setSynthesizedTimeline: (timeline) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        synthesizedTimeline: timeline,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updatePipelineProgress: (progress) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        pipelineProgress: {
          ...currentProject.pipelineProgress,
          ...progress,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateConfiguration: (config) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        configuration: {
          ...currentProject.configuration,
          ...config,
        },
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setOutputUrl: (url) => {
    const currentProject = get().project;
    if (!currentProject) return;

    set({
      project: {
        ...currentProject,
        outputUrl: url,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setIsProcessing: (processing) => {
    set({ isProcessing: processing });
  },

  resetProject: () => {
    set({ project: null, isProcessing: false });
  },
}));
