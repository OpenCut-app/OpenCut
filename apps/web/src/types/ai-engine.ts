interface SourceVideo {
  id: string;
  name: string;
  file: File;
  url: string;
  thumbnailUrl?: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  audioChannels: number;
  normalizedUrl?: string;
}

interface VideoChunk {
  id: string;
  sourceVideoId: string;
  startTime: number;
  endTime: number;
  duration: number;
  overlapPrevious: number;
  overlapNext: number;
}

interface ChunkVisualStats {
  averageBrightness: number;
  blurScore: number;
  motionIntensity: number;
  faceDetected: boolean;
  facePosition?: FacePosition;
}

interface FacePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ChunkAudioStats {
  averageVolume: number;
  peakVolume: number;
  silenceRatio: number;
  noiseLevel: number;
}

interface ChunkAnnotation {
  chunkId: string;
  visualStats: ChunkVisualStats;
  audioStats: ChunkAudioStats;
  timecodeStart: string;
  timecodeEnd: string;
}

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  speaker?: string;
}

interface SemanticTopic {
  label: string;
  relevanceScore: number;
  startTime: number;
  endTime: number;
}

type SceneType =
  | "talking-head"
  | "b-roll"
  | "screen-capture"
  | "interview"
  | "transition"
  | "unknown";

type EmotionCategory =
  | "neutral"
  | "excited"
  | "serious"
  | "humorous"
  | "inspirational"
  | "informative";

interface ChunkAnalysis {
  chunkId: string;
  transcript: TranscriptSegment[];
  semanticTopics: SemanticTopic[];
  emotionCategory: EmotionCategory;
  energyScore: number;
  visualQualityScore: number;
  speakingConfidence: number;
  sceneType: SceneType;
  isFillerContent: boolean;
  hasSilence: boolean;
  keywords: string[];
}

interface ChunkScore {
  chunkId: string;
  relevanceScore: number;
  qualityScore: number;
  narrativeContinuityScore: number;
  compositeScore: number;
  isSelected: boolean;
  exclusionReason?: string;
}

interface ScoringWeights {
  relevance: number;
  quality: number;
  narrativeContinuity: number;
  energyBoost: number;
  hookBonus: number;
}

interface PruningConstraints {
  minimumCoreIdeas: number;
  maximumNarrativeGap: number;
  minimumOutputDuration: number;
  maximumOutputDuration: number;
  avoidAbruptJumps: boolean;
}

interface EditTransition {
  type: "cut" | "crossfade" | "zoom-in" | "zoom-out";
  duration: number;
  fromChunkId: string;
  toChunkId: string;
}

interface TimelineSegment {
  chunkId: string;
  sourceVideoId: string;
  startTime: number;
  endTime: number;
  trimStart: number;
  trimEnd: number;
  position: number;
  transition?: EditTransition;
}

interface SynthesizedTimeline {
  id: string;
  segments: TimelineSegment[];
  totalDuration: number;
  hookSegmentId?: string;
  closingSegmentId?: string;
}

interface ReframeSettings {
  targetAspectRatio: "9:16" | "1:1" | "4:5";
  subjectTracking: boolean;
  safeZoneMargin: number;
}

interface AudioCleanupSettings {
  noiseReduction: boolean;
  fillerWordRemoval: boolean;
  loudnessNormalization: boolean;
  targetLufs: number;
  compressionEnabled: boolean;
}

interface ExportPreset {
  name: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  format: string;
}

interface RefinementSettings {
  reframe: ReframeSettings;
  audioCleanup: AudioCleanupSettings;
  exportPreset: ExportPreset;
  captionsEnabled: boolean;
  captionStyle?: CaptionStyle;
}

interface CaptionStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: "top" | "center" | "bottom";
  highlightKeywords: boolean;
}

type PipelineStage =
  | "idle"
  | "uploading"
  | "normalizing"
  | "chunking"
  | "analyzing"
  | "scoring"
  | "synthesizing"
  | "refining"
  | "exporting"
  | "complete"
  | "error";

interface PipelineProgress {
  stage: PipelineStage;
  overallProgress: number;
  stageProgress: number;
  currentMessage: string;
  errorMessage?: string;
}

interface PipelineConfiguration {
  chunkDurationSeconds: number;
  chunkOverlapSeconds: number;
  scoringWeights: ScoringWeights;
  pruningConstraints: PruningConstraints;
  refinementSettings: RefinementSettings;
  targetDurationSeconds: number;
}

interface AiEngineProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceVideos: SourceVideo[];
  chunks: VideoChunk[];
  annotations: ChunkAnnotation[];
  analyses: ChunkAnalysis[];
  scores: ChunkScore[];
  synthesizedTimeline?: SynthesizedTimeline;
  pipelineProgress: PipelineProgress;
  configuration: PipelineConfiguration;
  outputUrl?: string;
}

export type {
  SourceVideo,
  VideoChunk,
  ChunkVisualStats,
  FacePosition,
  ChunkAudioStats,
  ChunkAnnotation,
  TranscriptSegment,
  SemanticTopic,
  SceneType,
  EmotionCategory,
  ChunkAnalysis,
  ChunkScore,
  ScoringWeights,
  PruningConstraints,
  EditTransition,
  TimelineSegment,
  SynthesizedTimeline,
  ReframeSettings,
  AudioCleanupSettings,
  ExportPreset,
  RefinementSettings,
  CaptionStyle,
  PipelineStage,
  PipelineProgress,
  PipelineConfiguration,
  AiEngineProject,
};
