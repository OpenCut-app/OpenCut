"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Upload,
  Play,
  Trash2,
  Video,
  Loader2,
  Download,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useAiEngineStore } from "@/stores/ai-engine-store";
import { ingestMultipleVideos, validateSourceVideos } from "@/lib/ai-engine";
import { runPipeline } from "@/lib/ai-engine/pipeline";
import type { SourceVideo, PipelineStage } from "@/types/ai-engine";
import { toast } from "sonner";

interface UploadedVideoPreview {
  video: Omit<SourceVideo, "id">;
  thumbnailUrl?: string;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "Ready",
  uploading: "Uploading...",
  normalizing: "Normalizing...",
  chunking: "Splitting into segments...",
  analyzing: "Analyzing with AI...",
  scoring: "Scoring segments...",
  synthesizing: "Building timeline...",
  refining: "Rendering output...",
  exporting: "Exporting...",
  complete: "Complete!",
  error: "Error",
};

const AiEnginePage = () => {
  const {
    project,
    isProcessing,
    initializeProject,
    addSourceVideo,
    removeSourceVideo,
    resetProject,
  } = useAiEngineStore();

  const [uploadedPreviews, setUploadedPreviews] = useState<UploadedVideoPreview[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [targetDuration, setTargetDuration] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processVideoFiles = useCallback(
    async (videoFiles: File[]) => {
      if (videoFiles.length === 0) {
        toast.error("Please select video files");
        return;
      }

      if (videoFiles.length + uploadedPreviews.length > 5) {
        toast.error("Maximum 5 videos allowed");
        return;
      }

      setIsIngesting(true);

      if (!project) {
        initializeProject("AI Short-Form Project");
      }

      const results = await ingestMultipleVideos(videoFiles, (completed, total) => {
        toast.info(`Processing ${completed}/${total} videos...`);
      });

      for (const result of results) {
        if (result.error) {
          toast.error(result.error);
          continue;
        }

        addSourceVideo(result.video);
        setUploadedPreviews((previous) => [
          ...previous,
          {
            video: result.video,
            thumbnailUrl: result.video.thumbnailUrl,
          },
        ]);
      }

      setIsIngesting(false);
    },
    [project, initializeProject, addSourceVideo, uploadedPreviews.length]
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const videoFiles = Array.from(files).filter((file) =>
        file.type.startsWith("video/")
      );

      await processVideoFiles(videoFiles);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [processVideoFiles]
  );

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      await processVideoFiles(files);
    },
    [processVideoFiles]
  );

  const handleRemoveVideo = useCallback(
    (index: number) => {
      const preview = uploadedPreviews[index];
      if (project && preview.video.url) {
        const matchingVideo = project.sourceVideos.find(
          (sourceVideo) => sourceVideo.name === preview.video.name
        );
        if (matchingVideo) {
          removeSourceVideo(matchingVideo.id);
        }
      }

      setUploadedPreviews((previous) =>
        previous.filter((_item, previewIndex) => previewIndex !== index)
      );
    },
    [project, removeSourceVideo, uploadedPreviews]
  );

  const handleStartPipeline = useCallback(async () => {
    if (!project || project.sourceVideos.length === 0) {
      toast.error("Please upload at least one video");
      return;
    }

    const validation = validateSourceVideos(project.sourceVideos);
    if (!validation.isValid) {
      for (const error of validation.errors) {
        toast.error(error);
      }
      return;
    }

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      await runPipeline(
        project.sourceVideos,
        {
          ...project.configuration,
          targetDurationSeconds: targetDuration,
        },
        { abortSignal: abortController.signal }
      );
      toast.success("Video generated successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Pipeline failed";
      if (errorMessage !== "Pipeline aborted") {
        toast.error(errorMessage);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [project, targetDuration]);

  const handleCancelPipeline = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("Pipeline cancelled");
    }
  }, []);

  const handleReset = useCallback(() => {
    resetProject();
    setUploadedPreviews([]);
    setShowSettings(false);
  }, [resetProject]);

  const handleDownload = useCallback(() => {
    if (!project?.outputUrl) return;

    const anchor = document.createElement("a");
    anchor.href = project.outputUrl;
    anchor.download = `${project.name || "ai-short"}.webm`;
    anchor.click();
    anchor.remove();
  }, [project]);

  const pipelineProgress = project?.pipelineProgress;
  const isComplete = pipelineProgress?.stage === "complete";
  const hasError = pipelineProgress?.stage === "error";

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-6 px-6 flex items-center justify-between w-full h-16">
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-muted-foreground transition-colors"
        >
          <ChevronLeft className="size-5 shrink-0" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        {project && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <X className="size-4" />
            Reset
          </Button>
        )}
      </div>

      <main className="max-w-4xl mx-auto px-6 pt-6 pb-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              AI Short-Form Generator
            </h1>
          </div>
          <p className="text-muted-foreground">
            Upload 1-5 videos and let AI create a polished short-form clip
          </p>
        </div>

        <div className="space-y-6">
          <UploadSection
            uploadedPreviews={uploadedPreviews}
            isIngesting={isIngesting}
            isProcessing={isProcessing}
            fileInputRef={fileInputRef}
            onFileSelect={handleFileSelect}
            onFileDrop={handleFileDrop}
            onRemoveVideo={handleRemoveVideo}
          />

          {uploadedPreviews.length > 0 && !isProcessing && !isComplete && (
            <SettingsSection
              showSettings={showSettings}
              targetDuration={targetDuration}
              onToggleSettings={() => setShowSettings(!showSettings)}
              onTargetDurationChange={setTargetDuration}
            />
          )}

          {isProcessing && pipelineProgress && (
            <ProcessingSection
              progress={pipelineProgress}
              onCancel={handleCancelPipeline}
            />
          )}

          {hasError && pipelineProgress && (
            <ErrorSection
              errorMessage={pipelineProgress.errorMessage || "Unknown error"}
              onRetry={handleStartPipeline}
            />
          )}

          {isComplete && project?.outputUrl && (
            <ResultSection
              outputUrl={project.outputUrl}
              duration={project.synthesizedTimeline?.totalDuration || 0}
              segmentCount={project.synthesizedTimeline?.segments.length || 0}
              onDownload={handleDownload}
            />
          )}

          {uploadedPreviews.length > 0 && !isProcessing && !isComplete && (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={handleStartPipeline}
                disabled={isIngesting}
                className="gap-2"
              >
                <Play className="size-5" />
                Generate Short-Form Video
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                AI analysis uses the server-side Gemini API. If unavailable,
                heuristic analysis will be used as fallback.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface UploadSectionProps {
  uploadedPreviews: UploadedVideoPreview[];
  isIngesting: boolean;
  isProcessing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (files: File[]) => void;
  onRemoveVideo: (index: number) => void;
}

const UploadSection = ({
  uploadedPreviews,
  isIngesting,
  isProcessing,
  fileInputRef,
  onFileSelect,
  onFileDrop,
  onRemoveVideo,
}: UploadSectionProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer.files).filter(
      (file) => file.type.startsWith("video/")
    );

    if (droppedFiles.length > 0) {
      onFileDrop(droppedFiles);
    }
  }, [onFileDrop]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Source Videos</h2>
          <span className="text-sm text-muted-foreground">
            {uploadedPreviews.length}/5 videos
          </span>
        </div>

        {uploadedPreviews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            {uploadedPreviews.map((preview, index) => (
              <VideoPreviewCard
                key={preview.video.name}
                preview={preview}
                index={index}
                onRemove={onRemoveVideo}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        )}

        {uploadedPreviews.length < 5 && !isProcessing && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isIngesting}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            {isIngesting ? (
              <Loader2 className="size-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="size-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {isIngesting ? "Processing..." : "Drop videos here or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                MP4, WebM, MOV supported
              </p>
            </div>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          onChange={onFileSelect}
          className="hidden"
          aria-label="Upload video files"
        />
      </CardContent>
    </Card>
  );
};

interface VideoPreviewCardProps {
  preview: UploadedVideoPreview;
  index: number;
  onRemove: (index: number) => void;
  isProcessing: boolean;
}

const VideoPreviewCard = ({
  preview,
  index,
  onRemove,
  isProcessing,
}: VideoPreviewCardProps) => {
  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted aspect-video">
      {preview.thumbnailUrl ? (
        <img
          src={preview.thumbnailUrl}
          alt={preview.video.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Video className="size-6 text-muted-foreground" />
        </div>
      )}

      {!isProcessing && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-1 right-1 size-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Remove ${preview.video.name}`}
        >
          <Trash2 className="size-3" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
        <p className="text-xs text-white truncate">{preview.video.name}</p>
        <p className="text-xs text-white/70">
          {Math.round(preview.video.duration)}s
        </p>
      </div>
    </div>
  );
};

interface SettingsSectionProps {
  showSettings: boolean;
  targetDuration: number;
  onToggleSettings: () => void;
  onTargetDurationChange: (value: number) => void;
}

const SettingsSection = ({
  showSettings,
  targetDuration,
  onToggleSettings,
  onTargetDurationChange,
}: SettingsSectionProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <button
          type="button"
          onClick={onToggleSettings}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Settings</h2>
          </div>
          <ChevronLeft
            className={`size-5 text-muted-foreground transition-transform ${
              showSettings ? "-rotate-90" : "rotate-180"
            }`}
          />
        </button>

        {showSettings && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Target Duration: {targetDuration}s
              </Label>
              <Slider
                value={[targetDuration]}
                onValueChange={(values) => onTargetDurationChange(values[0])}
                min={15}
                max={90}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                The AI will aim for this clip length (15-90 seconds)
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ProcessingSectionProps {
  progress: {
    stage: PipelineStage;
    overallProgress: number;
    stageProgress: number;
    currentMessage: string;
  };
  onCancel: () => void;
}

const ProcessingSection = ({ progress, onCancel }: ProcessingSectionProps) => {
  return (
    <Card>
      <CardContent className="p-6" aria-live="polite" aria-atomic="true">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="size-5 text-primary animate-spin" />
            <h2 className="text-lg font-semibold">Processing</h2>
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {STAGE_LABELS[progress.stage]}
            </span>
            <span className="font-medium">
              {Math.round(progress.overallProgress * 100)}%
            </span>
          </div>
          <Progress value={progress.overallProgress * 100} />
          <p className="text-xs text-muted-foreground">
            {progress.currentMessage}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface ErrorSectionProps {
  errorMessage: string;
  onRetry: () => void;
}

const ErrorSection = ({ errorMessage, onRetry }: ErrorSectionProps) => {
  return (
    <Card className="border-destructive">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2">
          Generation Failed
        </h2>
        <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
};

interface ResultSectionProps {
  outputUrl: string;
  duration: number;
  segmentCount: number;
  onDownload: () => void;
}

const ResultSection = ({
  outputUrl,
  duration,
  segmentCount,
  onDownload,
}: ResultSectionProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Generated Video</h2>
          <Button onClick={onDownload} className="gap-2">
            <Download className="size-4" />
            Download
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden bg-black mb-4">
          <video
            src={outputUrl}
            controls
            className="w-full max-h-96 mx-auto"
            aria-label="Generated short-form video preview"
          >
            <track kind="captions" />
          </video>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{Math.round(duration)}s duration</span>
          <span>{segmentCount} segments</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AiEnginePage;
