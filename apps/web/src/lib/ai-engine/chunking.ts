import { generateUUID } from "@/lib/utils";
import type {
  SourceVideo,
  VideoChunk,
  ChunkAnnotation,
  ChunkVisualStats,
  ChunkAudioStats,
} from "@/types/ai-engine";

interface ChunkingOptions {
  chunkDurationSeconds: number;
  overlapSeconds: number;
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkDurationSeconds: 4,
  overlapSeconds: 1,
};

export const createChunksForVideo = (
  video: SourceVideo,
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): VideoChunk[] => {
  const chunks: VideoChunk[] = [];
  const { chunkDurationSeconds, overlapSeconds } = options;
  const stepSize = chunkDurationSeconds - overlapSeconds;

  let currentStart = 0;

  while (currentStart < video.duration) {
    const chunkEnd = Math.min(
      currentStart + chunkDurationSeconds,
      video.duration
    );
    const chunkDuration = chunkEnd - currentStart;

    if (chunkDuration < 1) break;

    const isFirstChunk = currentStart === 0;
    const isLastChunk = chunkEnd >= video.duration;

    chunks.push({
      id: generateUUID(),
      sourceVideoId: video.id,
      startTime: currentStart,
      endTime: chunkEnd,
      duration: chunkDuration,
      overlapPrevious: isFirstChunk ? 0 : overlapSeconds,
      overlapNext: isLastChunk ? 0 : overlapSeconds,
    });

    currentStart += stepSize;

    if (currentStart >= video.duration) break;
  }

  return chunks;
};

export const createChunksForAllVideos = (
  videos: SourceVideo[],
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): VideoChunk[] => {
  const allChunks: VideoChunk[] = [];

  for (const video of videos) {
    const videoChunks = createChunksForVideo(video, options);
    allChunks.push(...videoChunks);
  }

  return allChunks;
};

export const annotateChunk = async (
  chunk: VideoChunk,
  videoElement: HTMLVideoElement
): Promise<ChunkAnnotation> => {
  const audioBuffer = await decodeAudioFromElement(videoElement);
  return annotateChunkWithBuffer(chunk, videoElement, audioBuffer);
};

export const annotateAllChunks = async (
  chunks: VideoChunk[],
  videoElements: Map<string, HTMLVideoElement>,
  onProgress?: (completed: number, total: number) => void
): Promise<ChunkAnnotation[]> => {
  const annotations: ChunkAnnotation[] = [];
  const audioBufferCache = new Map<string, AudioBuffer | null>();

  for (const chunk of chunks) {
    const videoElement = videoElements.get(chunk.sourceVideoId);
    if (!videoElement) {
      annotations.push(createFallbackAnnotation(chunk));
      if (onProgress) onProgress(annotations.length, chunks.length);
      continue;
    }

    if (!audioBufferCache.has(chunk.sourceVideoId)) {
      const decodedBuffer = await decodeAudioFromElement(videoElement);
      audioBufferCache.set(chunk.sourceVideoId, decodedBuffer);
    }

    const audioBuffer = audioBufferCache.get(chunk.sourceVideoId) || null;
    const annotation = await annotateChunkWithBuffer(chunk, videoElement, audioBuffer);
    annotations.push(annotation);

    if (onProgress) {
      onProgress(annotations.length, chunks.length);
    }
  }

  return annotations;
};

const analyzeVisualStats = async (
  chunk: VideoChunk,
  videoElement: HTMLVideoElement
): Promise<ChunkVisualStats> => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return createDefaultVisualStats();
  }

  canvas.width = videoElement.videoWidth || 320;
  canvas.height = videoElement.videoHeight || 240;

  await seekToTime(videoElement, chunk.startTime + chunk.duration / 2);

  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const brightness = calculateAverageBrightness(imageData);
  const blurScore = estimateBlurScore(imageData);
  const hasFace = estimateFacePresence(imageData);

  canvas.remove();

  return {
    averageBrightness: brightness,
    blurScore,
    motionIntensity: 0.5,
    faceDetected: hasFace,
  };
};

const decodeAudioFromElement = async (
  videoElement: HTMLVideoElement
): Promise<AudioBuffer | null> => {
  try {
    const videoSrc = videoElement.src || videoElement.currentSrc;
    if (!videoSrc) return null;

    const response = await fetch(videoSrc);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new OfflineAudioContext(1, 44100, 44100);
    return await audioContext.decodeAudioData(arrayBuffer.slice(0));
  } catch {
    return null;
  }
};

const annotateChunkWithBuffer = async (
  chunk: VideoChunk,
  videoElement: HTMLVideoElement,
  audioBuffer: AudioBuffer | null
): Promise<ChunkAnnotation> => {
  const visualStats = await analyzeVisualStats(chunk, videoElement);
  const audioStats = analyzeAudioStatsFromBuffer(chunk, audioBuffer);

  return {
    chunkId: chunk.id,
    visualStats,
    audioStats,
    timecodeStart: formatTimecode(chunk.startTime),
    timecodeEnd: formatTimecode(chunk.endTime),
  };
};

const analyzeAudioStatsFromBuffer = (
  chunk: VideoChunk,
  audioBuffer: AudioBuffer | null
): ChunkAudioStats => {
  if (!audioBuffer) {
    return createDefaultAudioStats();
  }

  try {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(chunk.startTime * sampleRate);
    const endSample = Math.min(
      Math.floor(chunk.endTime * sampleRate),
      audioBuffer.length
    );
    const channelData = audioBuffer.getChannelData(0);

    let sumVolume = 0;
    let peakVolume = 0;
    let silentSamples = 0;
    const sampleCount = endSample - startSample;
    const sampleStep = Math.max(1, Math.floor(sampleCount / 1000));

    let sampledCount = 0;
    for (let index = startSample; index < endSample; index += sampleStep) {
      const amplitude = Math.abs(channelData[index] || 0);
      sumVolume += amplitude;
      if (amplitude > peakVolume) peakVolume = amplitude;
      if (amplitude < 0.02) silentSamples++;
      sampledCount++;
    }

    const averageVolume = sampledCount > 0 ? sumVolume / sampledCount : 0;
    const silenceRatio = sampledCount > 0 ? silentSamples / sampledCount : 1;

    return {
      averageVolume: Math.min(1, averageVolume),
      peakVolume: Math.min(1, peakVolume),
      silenceRatio,
      noiseLevel: 0.1,
    };
  } catch {
    return createDefaultAudioStats();
  }
};

const createDefaultAudioStats = (): ChunkAudioStats => ({
  averageVolume: 0.5,
  peakVolume: 0.7,
  silenceRatio: 0.2,
  noiseLevel: 0.1,
});

const seekToTime = (
  videoElement: HTMLVideoElement,
  timeSeconds: number
): Promise<void> => {
  return new Promise((resolve) => {
    const handleSeeked = () => {
      videoElement.removeEventListener("seeked", handleSeeked);
      resolve();
    };
    videoElement.addEventListener("seeked", handleSeeked);
    videoElement.currentTime = timeSeconds;
  });
};

const calculateAverageBrightness = (imageData: ImageData): number => {
  const data = imageData.data;
  let totalBrightness = 0;
  const pixelCount = data.length / 4;
  const sampleStep = Math.max(1, Math.floor(pixelCount / 1000));

  for (let index = 0; index < data.length; index += 4 * sampleStep) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    totalBrightness += (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
  }

  return totalBrightness / Math.ceil(pixelCount / sampleStep);
};

const estimateBlurScore = (imageData: ImageData): number => {
  const data = imageData.data;
  const width = imageData.width;
  let edgeSum = 0;
  let sampleCount = 0;
  const sampleStep = Math.max(1, Math.floor(width / 50));

  for (let row = 1; row < imageData.height - 1; row += sampleStep) {
    for (let column = 1; column < width - 1; column += sampleStep) {
      const currentIndex = (row * width + column) * 4;
      const rightIndex = (row * width + column + 1) * 4;
      const belowIndex = ((row + 1) * width + column) * 4;

      const currentGray =
        data[currentIndex] * 0.299 +
        data[currentIndex + 1] * 0.587 +
        data[currentIndex + 2] * 0.114;
      const rightGray =
        data[rightIndex] * 0.299 +
        data[rightIndex + 1] * 0.587 +
        data[rightIndex + 2] * 0.114;
      const belowGray =
        data[belowIndex] * 0.299 +
        data[belowIndex + 1] * 0.587 +
        data[belowIndex + 2] * 0.114;

      const horizontalEdge = Math.abs(currentGray - rightGray);
      const verticalEdge = Math.abs(currentGray - belowGray);
      edgeSum += horizontalEdge + verticalEdge;
      sampleCount++;
    }
  }

  const averageEdge = sampleCount > 0 ? edgeSum / sampleCount : 0;
  return Math.min(1, Math.max(0, 1 - averageEdge / 50));
};

const estimateFacePresence = (imageData: ImageData): boolean => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  let skinPixelCount = 0;
  const totalSampled = Math.floor((width * height) / 16);
  const sampleStep = 4;

  for (let row = 0; row < height; row += sampleStep) {
    for (let column = 0; column < width; column += sampleStep) {
      const index = (row * width + column) * 4;
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];

      if (isSkinTone(red, green, blue)) {
        skinPixelCount++;
      }
    }
  }

  const skinRatio = skinPixelCount / totalSampled;
  return skinRatio > 0.1 && skinRatio < 0.6;
};

const isSkinTone = (red: number, green: number, blue: number): boolean => {
  return (
    red > 95 &&
    green > 40 &&
    blue > 20 &&
    red > green &&
    red > blue &&
    Math.abs(red - green) > 15 &&
    red - blue > 15
  );
};

const formatTimecode = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
};

const createDefaultVisualStats = (): ChunkVisualStats => ({
  averageBrightness: 0.5,
  blurScore: 0.5,
  motionIntensity: 0.5,
  faceDetected: false,
});

const createFallbackAnnotation = (chunk: VideoChunk): ChunkAnnotation => ({
  chunkId: chunk.id,
  visualStats: createDefaultVisualStats(),
  audioStats: createDefaultAudioStats(),
  timecodeStart: formatTimecode(chunk.startTime),
  timecodeEnd: formatTimecode(chunk.endTime),
});
