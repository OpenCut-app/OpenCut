import { FFmpeg } from "@ffmpeg/ffmpeg";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from "mediabunny";

let ffmpeg: FFmpeg | null = null;

export const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg) return ffmpeg;

  ffmpeg = new FFmpeg();
  await ffmpeg.load(); // Use default config

  return ffmpeg;
};

export async function generateThumbnail({
  videoFile,
  timeInSeconds,
}: {
  videoFile: File;
  timeInSeconds: number;
}): Promise<string> {
  const input = new Input({
    source: new BlobSource(videoFile),
    formats: ALL_FORMATS,
  });

  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error("No video track found in the file");
  }

  // Check if we can decode this video
  const canDecode = await videoTrack.canDecode();
  if (!canDecode) {
    throw new Error("Video codec not supported for decoding");
  }

  const sink = new VideoSampleSink(videoTrack);

  const frame = await sink.getSample(timeInSeconds);

  if (!frame) {
    throw new Error("Could not get frame at specified time");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  frame.draw(ctx, 0, 0, 320, 240);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error("Failed to create thumbnail blob"));
        }
      },
      "image/jpeg",
      0.8
    );
  });
}

export async function getVideoInfo({
  videoFile,
}: {
  videoFile: File;
}): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  const input = new Input({
    source: new BlobSource(videoFile),
    formats: ALL_FORMATS,
  });

  const duration = await input.computeDuration();
  const videoTrack = await input.getPrimaryVideoTrack();

  if (!videoTrack) {
    throw new Error("No video track found in the file");
  }

  // Get frame rate from packet statistics
  const packetStats = await videoTrack.computePacketStats(100);
  const fps = packetStats.averagePacketRate;

  return {
    duration,
    width: videoTrack.displayWidth,
    height: videoTrack.displayHeight,
    fps,
  };
}

// Audio mixing for timeline - keeping FFmpeg for now due to complexity
// TODO: Replace with Mediabunny audio processing when implementing canvas preview
export const extractTimelineAudio = async (
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  // Create fresh FFmpeg instance for this operation
  const ffmpeg = new FFmpeg();

  try {
    await ffmpeg.load();
  } catch (error) {
    console.error("Failed to load fresh FFmpeg instance:", error);
    throw new Error("Unable to initialize audio processing. Please try again.");
  }

  const timeline = useTimelineStore.getState();
  const mediaStore = useMediaStore.getState();

  const tracks = timeline.tracks;
  const totalDuration = timeline.getTotalDuration();

  if (totalDuration === 0) {
    const emptyAudioData = new ArrayBuffer(44);
    return new Blob([emptyAudioData], { type: "audio/wav" });
  }

  if (onProgress) {
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress * 100);
    });
  }

  const audioElements: Array<{
    file: File;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd: number;
    trackMuted: boolean;
  }> = [];

  for (const track of tracks) {
    if (track.muted) continue;

    for (const element of track.elements) {
      if (element.type === "media") {
        const mediaFile = mediaStore.mediaFiles.find(
          (m) => m.id === element.mediaId
        );
        if (!mediaFile) continue;

        if (mediaFile.type === "video" || mediaFile.type === "audio") {
          audioElements.push({
            file: mediaFile.file,
            startTime: element.startTime,
            duration: element.duration,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            trackMuted: track.muted || false,
          });
        }
      }
    }
  }

  if (audioElements.length === 0) {
    // Return silent audio if no audio elements
    const silentDuration = Math.max(1, totalDuration); // At least 1 second
    try {
      const silentAudio = await generateSilentAudio(silentDuration);
      return silentAudio;
    } catch (error) {
      console.error("Failed to generate silent audio:", error);
      throw new Error("Unable to generate audio for empty timeline.");
    }
  }

  // Create a complex filter to mix all audio sources
  const inputFiles: string[] = [];
  const filterInputs: string[] = [];

  try {
    for (let i = 0; i < audioElements.length; i++) {
      const element = audioElements[i];
      const inputName = `input_${i}.${element.file.name.split(".").pop()}`;
      inputFiles.push(inputName);

      try {
        await ffmpeg.writeFile(
          inputName,
          new Uint8Array(await element.file.arrayBuffer())
        );
      } catch (error) {
        console.error(`Failed to write file ${element.file.name}:`, error);
        throw new Error(
          `Unable to process file: ${element.file.name}. The file may be corrupted or in an unsupported format.`
        );
      }

      const actualStart = element.trimStart;
      const actualDuration =
        element.duration - element.trimStart - element.trimEnd;

      const filterName = `audio_${i}`;
      filterInputs.push(
        `[${i}:a]atrim=start=${actualStart}:duration=${actualDuration},asetpts=PTS-STARTPTS,adelay=${element.startTime * 1000}|${element.startTime * 1000}[${filterName}]`
      );
    }

    const mixFilter =
      audioElements.length === 1
        ? `[audio_0]aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`
        : `${filterInputs.map((_, i) => `[audio_${i}]`).join("")}amix=inputs=${audioElements.length}:duration=longest:dropout_transition=2,aresample=44100,aformat=sample_fmts=s16:channel_layouts=stereo[out]`;

    const complexFilter = [...filterInputs, mixFilter].join(";");
    const outputName = "timeline_audio.wav";

    const ffmpegArgs = [
      ...inputFiles.flatMap((name) => ["-i", name]),
      "-filter_complex",
      complexFilter,
      "-map",
      "[out]",
      "-t",
      totalDuration.toString(),
      "-c:a",
      "pcm_s16le",
      "-ar",
      "44100",
      outputName,
    ];

    try {
      await ffmpeg.exec(ffmpegArgs);
    } catch (error) {
      console.error("FFmpeg execution failed:", error);
      throw new Error(
        "Audio processing failed. Some audio files may be corrupted or incompatible."
      );
    }

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup file ${inputFile}:`, cleanupError);
      }
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {
      console.warn("Failed to cleanup output file:", cleanupError);
    }

    throw error;
  } finally {
    for (const inputFile of inputFiles) {
      try {
        await ffmpeg.deleteFile(inputFile);
      } catch (cleanupError) {}
    }
    try {
      await ffmpeg.deleteFile("timeline_audio.wav");
    } catch (cleanupError) {}
  }
};

const generateSilentAudio = async (durationSeconds: number): Promise<Blob> => {
  const ffmpeg = await initFFmpeg();
  const outputName = "silent.wav";

  try {
    await ffmpeg.exec([
      "-f",
      "lavfi",
      "-i",
      `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t",
      durationSeconds.toString(),
      "-c:a",
      "pcm_s16le",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data], { type: "audio/wav" });

    return blob;
  } catch (error) {
    console.error("Failed to generate silent audio:", error);
    throw error;
  } finally {
    try {
      await ffmpeg.deleteFile(outputName);
    } catch (cleanupError) {
      // Silent cleanup
    }
  }
};
