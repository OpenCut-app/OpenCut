import type { SourceVideo } from "@/types/ai-engine";
import { getVideoInfo, generateThumbnail } from "@/lib/mediabunny-utils";

interface IngestionResult {
  video: Omit<SourceVideo, "id">;
  error?: string;
}

interface NormalizationTarget {
  width: number;
  height: number;
  fps: number;
  audioChannels: number;
}

const DEFAULT_NORMALIZATION_TARGET: NormalizationTarget = {
  width: 1920,
  height: 1080,
  fps: 30,
  audioChannels: 2,
};

export const ingestVideo = async (file: File): Promise<IngestionResult> => {
  try {
    const url = URL.createObjectURL(file);

    const videoInfo = await getVideoInfo({ videoFile: file });

    let thumbnailUrl: string | undefined;
    try {
      thumbnailUrl = await generateThumbnail({
        videoFile: file,
        timeInSeconds: Math.min(1, videoInfo.duration * 0.1),
      });
    } catch (thumbnailError) {
      console.error("Thumbnail generation failed:", thumbnailError);
    }

    const audioChannels = await detectAudioChannels(file);

    return {
      video: {
        name: file.name,
        file,
        url,
        thumbnailUrl,
        duration: videoInfo.duration,
        width: videoInfo.width,
        height: videoInfo.height,
        fps: videoInfo.fps || DEFAULT_NORMALIZATION_TARGET.fps,
        audioChannels,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown ingestion error";
    return {
      video: {
        name: file.name,
        file,
        url: "",
        duration: 0,
        width: 0,
        height: 0,
        fps: 0,
        audioChannels: 0,
      },
      error: errorMessage,
    };
  }
};

export const ingestMultipleVideos = async (
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<IngestionResult[]> => {
  const results: IngestionResult[] = [];
  const totalFiles = files.length;

  for (const file of files) {
    if (!file.type.startsWith("video/")) {
      results.push({
        video: {
          name: file.name,
          file,
          url: "",
          duration: 0,
          width: 0,
          height: 0,
          fps: 0,
          audioChannels: 0,
        },
        error: `File "${file.name}" is not a video file`,
      });
      continue;
    }

    const result = await ingestVideo(file);
    results.push(result);

    if (onProgress) {
      onProgress(results.length, totalFiles);
    }
  }

  return results;
};

export const validateSourceVideos = (
  videos: Array<Omit<SourceVideo, "id">>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (videos.length < 1) {
    errors.push("At least 1 source video is required");
  }

  if (videos.length > 5) {
    errors.push("Maximum of 5 source videos allowed");
  }

  for (const video of videos) {
    if (video.duration < 5) {
      errors.push(`Video "${video.name}" is too short (minimum 5 seconds)`);
    }

    if (video.width === 0 || video.height === 0) {
      errors.push(`Video "${video.name}" has invalid dimensions`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const detectAudioChannels = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    try {
      const audioContext = new AudioContext();
      const reader = new FileReader();

      reader.addEventListener("load", async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          resolve(audioBuffer.numberOfChannels);
          audioContext.close();
        } catch {
          resolve(DEFAULT_NORMALIZATION_TARGET.audioChannels);
          audioContext.close();
        }
      });

      reader.addEventListener("error", () => {
        resolve(DEFAULT_NORMALIZATION_TARGET.audioChannels);
      });

      reader.readAsArrayBuffer(file.slice(0, 1024 * 1024));
    } catch {
      resolve(DEFAULT_NORMALIZATION_TARGET.audioChannels);
    }
  });
};
