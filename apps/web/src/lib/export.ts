import {
  Output,
  Mp4OutputFormat,
  WebMOutputFormat,
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
} from "mediabunny";
import { renderTimelineFrame } from "./timeline-renderer";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { DEFAULT_FPS, DEFAULT_CANVAS_SIZE } from "@/stores/project-store";
import { ExportOptions, ExportResult } from "@/types/export";
import { TimelineTrack } from "@/types/timeline";
import { MediaFile } from "@/types/media";

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: "mp4",
  quality: "high",
  includeAudio: true,
};

const qualityMap = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  very_high: QUALITY_VERY_HIGH,
};

interface AudioElement {
  buffer: AudioBuffer;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  muted: boolean;
}

async function createTimelineAudioBuffer(
  tracks: TimelineTrack[],
  mediaFiles: MediaFile[],
  duration: number,
  sampleRate: number = 44100
): Promise<AudioBuffer | null> {
  // Get Web Audio context
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  // Collect all audio elements from timeline
  const audioElements: AudioElement[] = [];
  const mediaMap = new Map<string, MediaFile>(mediaFiles.map((m) => [m.id, m]));

  for (const track of tracks) {
    if (track.muted) continue;

    for (const element of track.elements) {
      if (element.type !== "media") continue;

      const mediaElement = element;
      const mediaItem = mediaMap.get(mediaElement.mediaId);
      if (!mediaItem || mediaItem.type !== "audio") continue;

      const visibleDuration =
        mediaElement.duration - mediaElement.trimStart - mediaElement.trimEnd;
      if (visibleDuration <= 0) continue;

      try {
        // Decode audio file
        const arrayBuffer = await mediaItem.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(
          arrayBuffer.slice(0)
        );

        audioElements.push({
          buffer: audioBuffer,
          startTime: mediaElement.startTime,
          duration: mediaElement.duration,
          trimStart: mediaElement.trimStart,
          trimEnd: mediaElement.trimEnd,
          muted: mediaElement.muted || track.muted || false,
        });
      } catch (error) {
        console.warn(`Failed to decode audio file ${mediaItem.name}:`, error);
      }
    }
  }

  if (audioElements.length === 0) {
    return null; // No audio to mix
  }

  // Create output buffer
  const outputChannels = 2; // Stereo
  const outputLength = Math.ceil(duration * sampleRate);
  const outputBuffer = audioContext.createBuffer(
    outputChannels,
    outputLength,
    sampleRate
  );

  // Mix all audio elements
  for (const element of audioElements) {
    if (element.muted) continue;

    const {
      buffer,
      startTime,
      trimStart,
      trimEnd,
      duration: elementDuration,
    } = element;

    // Calculate timing
    const sourceStartSample = Math.floor(trimStart * buffer.sampleRate);
    const sourceDuration = elementDuration - trimStart - trimEnd;
    const sourceLengthSamples = Math.floor(sourceDuration * buffer.sampleRate);
    const outputStartSample = Math.floor(startTime * sampleRate);

    // Resample if needed (simple approach)
    const resampleRatio = sampleRate / buffer.sampleRate;
    const resampledLength = Math.floor(sourceLengthSamples * resampleRatio);

    // Mix each channel
    for (let channel = 0; channel < outputChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      const sourceChannel = Math.min(channel, buffer.numberOfChannels - 1);
      const sourceData = buffer.getChannelData(sourceChannel);

      for (let i = 0; i < resampledLength; i++) {
        const outputIndex = outputStartSample + i;
        if (outputIndex >= outputLength) break;

        // Simple resampling (could be improved with proper interpolation)
        const sourceIndex = sourceStartSample + Math.floor(i / resampleRatio);
        if (sourceIndex >= sourceData.length) break;

        outputData[outputIndex] += sourceData[sourceIndex];
      }
    }
  }

  return outputBuffer;
}

export async function exportProject(
  options: ExportOptions
): Promise<ExportResult> {
  const { format, quality, fps, includeAudio, onProgress, onCancel } = options;

  try {
    const timelineStore = useTimelineStore.getState();
    const mediaStore = useMediaStore.getState();
    const projectStore = useProjectStore.getState();

    const { tracks, getTotalDuration } = timelineStore;
    const { mediaFiles } = mediaStore;
    const { activeProject } = projectStore;

    if (!activeProject) {
      return { success: false, error: "No active project" };
    }

    const duration = getTotalDuration();
    if (duration === 0) {
      return { success: false, error: "Project is empty" };
    }

    const exportFps = fps || activeProject.fps || DEFAULT_FPS;
    const canvasSize = activeProject.canvasSize || DEFAULT_CANVAS_SIZE;

    const outputFormat =
      format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();

    // BufferTarget for smaller files, StreamTarget for larger ones
    // TODO: Implement StreamTarget
    const output = new Output({
      format: outputFormat,
      target: new BufferTarget(),
    });

    // Canvas for rendering
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return { success: false, error: "Failed to create canvas context" };
    }

    const videoSource = new CanvasSource(canvas, {
      codec: format === "webm" ? "vp9" : "avc", // VP9 for WebM, H.264 for MP4
      bitrate: qualityMap[quality],
    });

    output.addVideoTrack(videoSource, { frameRate: exportFps });

    // Add audio track if requested (but don't add data yet)
    let audioSource: AudioBufferSource | null = null;
    let audioBuffer: AudioBuffer | null = null;

    if (includeAudio) {
      onProgress?.(0.05); // 5% for audio processing

      audioBuffer = await createTimelineAudioBuffer(
        tracks,
        mediaFiles,
        duration
      );

      if (audioBuffer) {
        audioSource = new AudioBufferSource({
          codec: format === "webm" ? "opus" : "aac", // Opus for WebM, AAC for MP4
          bitrate: qualityMap[quality], // Use same quality for audio
        });

        output.addAudioTrack(audioSource);
      }
    }

    // Start the output (after all tracks are added)
    await output.start();

    // Now add audio data after starting
    if (audioSource && audioBuffer) {
      await audioSource.add(audioBuffer);
      audioSource.close();
    }

    const totalFrames = Math.ceil(duration * exportFps);
    let cancelled = false;

    // Render each frame
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      // Check for cancellation
      if (onCancel?.()) {
        cancelled = true;
        break;
      }

      const time = frameIndex / exportFps;

      await renderTimelineFrame({
        ctx,
        time,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        tracks,
        mediaFiles,
        backgroundType: activeProject.backgroundType,
        blurIntensity: activeProject.blurIntensity,
        backgroundColor:
          activeProject.backgroundType === "blur"
            ? undefined
            : activeProject.backgroundColor || "#000000",
        projectCanvasSize: canvasSize,
      });

      const frameDuration = 1 / exportFps;
      await videoSource.add(time, frameDuration);

      // Adjust progress to account for audio processing (5% at start)
      const videoProgress = includeAudio
        ? 0.05 + (frameIndex / totalFrames) * 0.95
        : frameIndex / totalFrames;
      onProgress?.(videoProgress);
    }

    if (cancelled) {
      await output.cancel();
      return { success: false, cancelled: true };
    }
    videoSource.close();
    await output.finalize();
    onProgress?.(1);

    return {
      success: true,
      buffer: output.target.buffer || undefined,
    };
  } catch (error) {
    console.error("Export failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown export error",
    };
  }
}

export function getExportMimeType(format: "mp4" | "webm"): string {
  return format === "webm" ? "video/webm" : "video/mp4";
}

export function getExportFileExtension(format: "mp4" | "webm"): string {
  return `.${format}`;
}
