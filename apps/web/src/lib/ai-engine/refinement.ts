import type {
  SynthesizedTimeline,
  TimelineSegment,
  RefinementSettings,
  AudioCleanupSettings,
  ReframeSettings,
  ExportPreset,
  SourceVideo,
  TranscriptSegment,
  CaptionStyle,
} from "@/types/ai-engine";

interface RefinementResult {
  outputBlob: Blob;
  outputUrl: string;
  duration: number;
  captions?: GeneratedCaption[];
}

interface GeneratedCaption {
  text: string;
  startTime: number;
  endTime: number;
  keywords: string[];
}

interface ReframeTransform {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
}

export const refineAndExport = async (
  timeline: SynthesizedTimeline,
  sourceVideos: SourceVideo[],
  transcriptSegments: TranscriptSegment[],
  settings: RefinementSettings,
  onProgress?: (stage: string, progress: number) => void,
  abortSignal?: AbortSignal
): Promise<RefinementResult> => {
  const videoMap = new Map(
    sourceVideos.map((video) => [video.id, video])
  );

  if (onProgress) onProgress("reframing", 0);
  const reframeTransforms = computeReframeTransforms(
    timeline.segments,
    videoMap,
    settings.reframe
  );

  if (abortSignal?.aborted) throw new Error("Pipeline aborted");

  if (onProgress) onProgress("audio", 0.3);
  const cleanedAudioBlobs = await processAudioCleanup(
    timeline.segments,
    videoMap,
    settings.audioCleanup
  );

  let captions: GeneratedCaption[] | undefined;
  if (settings.captionsEnabled && settings.captionStyle) {
    if (onProgress) onProgress("captions", 0.5);
    captions = generateCaptions(
      timeline,
      transcriptSegments,
      settings.captionStyle
    );
  }

  if (abortSignal?.aborted) throw new Error("Pipeline aborted");

  if (onProgress) onProgress("rendering", 0.6);
  const renderedBlob = await renderFinalOutput(
    timeline,
    videoMap,
    reframeTransforms,
    cleanedAudioBlobs,
    captions,
    settings.exportPreset,
    (renderProgress) => {
      if (onProgress) onProgress("rendering", 0.6 + renderProgress * 0.4);
    },
    abortSignal
  );

  const outputUrl = URL.createObjectURL(renderedBlob);

  return {
    outputBlob: renderedBlob,
    outputUrl,
    duration: timeline.totalDuration,
    captions,
  };
};

const computeReframeTransforms = (
  segments: TimelineSegment[],
  videoMap: Map<string, SourceVideo>,
  reframeSettings: ReframeSettings
): Map<string, ReframeTransform> => {
  const transforms = new Map<string, ReframeTransform>();

  const [targetWidthRatio, targetHeightRatio] = reframeSettings.targetAspectRatio
    .split(":")
    .map(Number);
  const targetAspect = targetWidthRatio / targetHeightRatio;

  for (const segment of segments) {
    const video = videoMap.get(segment.sourceVideoId);
    if (!video) continue;

    const sourceAspect = video.width / video.height;

    let cropWidth: number;
    let cropHeight: number;
    let cropX: number;
    let cropY: number;

    if (sourceAspect > targetAspect) {
      cropHeight = video.height * (1 - reframeSettings.safeZoneMargin * 2);
      cropWidth = cropHeight * targetAspect;
      cropX = (video.width - cropWidth) / 2;
      cropY = video.height * reframeSettings.safeZoneMargin;
    } else {
      cropWidth = video.width * (1 - reframeSettings.safeZoneMargin * 2);
      cropHeight = cropWidth / targetAspect;
      cropX = video.width * reframeSettings.safeZoneMargin;
      cropY = (video.height - cropHeight) / 2;
    }

    const baseWidth = 1080;
    const outputWidth = baseWidth;
    const outputHeight = Math.round(baseWidth * (targetHeightRatio / targetWidthRatio));

    transforms.set(segment.chunkId, {
      cropX: Math.round(cropX),
      cropY: Math.round(cropY),
      cropWidth: Math.round(cropWidth),
      cropHeight: Math.round(cropHeight),
      outputWidth,
      outputHeight,
    });
  }

  return transforms;
};

const processAudioCleanup = async (
  segments: TimelineSegment[],
  videoMap: Map<string, SourceVideo>,
  audioSettings: AudioCleanupSettings
): Promise<Map<string, Blob>> => {
  const cleanedBlobs = new Map<string, Blob>();
  const audioBufferCache = new Map<string, AudioBuffer>();

  for (const segment of segments) {
    const video = videoMap.get(segment.sourceVideoId);
    if (!video) continue;

    try {
      let cachedBuffer = audioBufferCache.get(video.id);
      if (!cachedBuffer) {
        cachedBuffer = await decodeVideoAudio(video.url);
        audioBufferCache.set(video.id, cachedBuffer);
      }

      const audioBlob = extractAudioSegment(cachedBuffer, segment);
      const processedBlob = await applyAudioProcessing(audioBlob, audioSettings);
      cleanedBlobs.set(segment.chunkId, processedBlob);
    } catch (error) {
      console.error("Audio cleanup failed for segment:", segment.chunkId, error);
    }
  }

  return cleanedBlobs;
};

const decodeVideoAudio = async (videoUrl: string): Promise<AudioBuffer> => {
  const response = await fetch(videoUrl);
  const arrayBuffer = await response.arrayBuffer();
  const decodingContext = new OfflineAudioContext(2, 44100, 44100);
  return decodingContext.decodeAudioData(arrayBuffer.slice(0));
};

const extractAudioSegment = (
  audioBuffer: AudioBuffer,
  segment: TimelineSegment
): Blob => {
  const startSample = Math.floor(segment.startTime * audioBuffer.sampleRate);
  const endSample = Math.min(
    Math.floor(segment.endTime * audioBuffer.sampleRate),
    audioBuffer.length
  );
  const segmentLength = Math.max(1, endSample - startSample);
  const channelCount = audioBuffer.numberOfChannels;

  const sampleRate = audioBuffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataSize = segmentLength * blockAlign;
  const headerSize = 44;

  const wavBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(wavBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, headerSize + dataSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = headerSize;
  for (let sample = 0; sample < segmentLength; sample++) {
    for (let channel = 0; channel < channelCount; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const value = channelData[startSample + sample] || 0;
      const clampedValue = Math.max(-1, Math.min(1, value));
      const intValue = clampedValue < 0
        ? clampedValue * 0x8000
        : clampedValue * 0x7FFF;
      view.setInt16(offset, intValue, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([wavBuffer], { type: "audio/wav" });
};

const findPeakAmplitude = (audioBuffer: AudioBuffer): number => {
  let peak = 0;
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    const sampleStep = Math.max(1, Math.floor(channelData.length / 5000));
    for (let index = 0; index < channelData.length; index += sampleStep) {
      const amplitude = Math.abs(channelData[index]);
      if (amplitude > peak) peak = amplitude;
    }
  }
  return peak;
};

const applyAudioProcessing = async (
  audioBlob: Blob,
  settings: AudioCleanupSettings
): Promise<Blob> => {
  if (audioBlob.size === 0) return audioBlob;

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();

    const tempContext = new OfflineAudioContext(2, 44100, 44100);
    const audioBuffer = await tempContext.decodeAudioData(arrayBuffer.slice(0));

    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );

    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    let lastNode: AudioNode = source;

    if (settings.noiseReduction) {
      const highpassFilter = offlineContext.createBiquadFilter();
      highpassFilter.type = "highpass";
      highpassFilter.frequency.value = 80;
      lastNode.connect(highpassFilter);
      lastNode = highpassFilter;

      const lowpassFilter = offlineContext.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = 12000;
      lastNode.connect(lowpassFilter);
      lastNode = lowpassFilter;
    }

    if (settings.compressionEnabled) {
      const compressor = offlineContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      lastNode.connect(compressor);
      lastNode = compressor;
    }

    if (settings.loudnessNormalization) {
      const gainNode = offlineContext.createGain();
      const peakAmplitude = findPeakAmplitude(audioBuffer);
      const targetAmplitude = Math.pow(10, settings.targetLufs / 20);
      const normalizedGain = peakAmplitude > 0.001
        ? targetAmplitude / peakAmplitude
        : 1.0;
      gainNode.gain.value = Math.min(4.0, Math.max(0.1, normalizedGain));
      lastNode.connect(gainNode);
      lastNode = gainNode;
    }

    lastNode.connect(offlineContext.destination);
    source.start();

    const processedBuffer = await offlineContext.startRendering();
    return audioBufferToBlob(processedBuffer);
  } catch {
    return audioBlob;
  }
};

const generateCaptions = (
  timeline: SynthesizedTimeline,
  transcriptSegments: TranscriptSegment[],
  captionStyle: CaptionStyle
): GeneratedCaption[] => {
  const captions: GeneratedCaption[] = [];

  for (const segment of timeline.segments) {
    const relevantTranscripts = transcriptSegments.filter(
      (transcript) =>
        transcript.startTime >= segment.startTime &&
        transcript.endTime <= segment.endTime
    );

    for (const transcript of relevantTranscripts) {
      const keywords = captionStyle.highlightKeywords
        ? extractKeywords(transcript.text)
        : [];

      captions.push({
        text: transcript.text,
        startTime: segment.position + (transcript.startTime - segment.startTime),
        endTime: segment.position + (transcript.endTime - segment.startTime),
        keywords,
      });
    }
  }

  return captions;
};

const extractKeywords = (text: string): string[] => {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can",
    "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "it", "this", "that", "these", "those", "and", "or", "but",
    "if", "so", "not", "no", "just", "very", "really", "also",
  ]);

  const words = text.toLowerCase().split(/\s+/);
  return words.filter(
    (word) => word.length > 3 && !stopWords.has(word)
  );
};

const renderFinalOutput = async (
  timeline: SynthesizedTimeline,
  videoMap: Map<string, SourceVideo>,
  reframeTransforms: Map<string, ReframeTransform>,
  audioBlobs: Map<string, Blob>,
  captions: GeneratedCaption[] | undefined,
  exportPreset: ExportPreset,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = exportPreset.width;
  canvas.height = exportPreset.height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Cannot create canvas context for rendering");
  }

  const stream = canvas.captureStream(exportPreset.fps);

  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();

  let audioScheduleOffset = 0;
  for (const segment of timeline.segments) {
    const audioBlob = audioBlobs.get(segment.chunkId);
    if (!audioBlob || audioBlob.size === 0) {
      audioScheduleOffset += segment.endTime - segment.startTime;
      continue;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioDestination);
      source.start(audioContext.currentTime + audioScheduleOffset);
    } catch {
    }

    audioScheduleOffset += segment.endTime - segment.startTime;
  }

  for (const audioTrack of audioDestination.stream.getAudioTracks()) {
    stream.addTrack(audioTrack);
  }

  const mimeType = `video/${exportPreset.format === "mp4" ? "mp4" : "webm"}`;
  const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
    ? mimeType
    : "video/webm";

  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: supportedMimeType,
    videoBitsPerSecond: exportPreset.bitrate,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const outputBlob = new Blob(recordedChunks, { type: supportedMimeType });
      canvas.remove();
      audioContext.close();
      resolve(outputBlob);
    };

    mediaRecorder.onerror = (event) => {
      canvas.remove();
      audioContext.close();
      reject(new Error(`Recording error: ${event}`));
    };

    mediaRecorder.start();

    renderSegmentsSequentially(
      timeline.segments,
      videoMap,
      reframeTransforms,
      captions,
      context,
      canvas,
      exportPreset,
      onProgress,
      abortSignal
    ).then(() => {
      mediaRecorder.stop();
    }).catch((renderError) => {
      mediaRecorder.stop();
      reject(renderError);
    });
  });
};

const waitForAnimationFrame = (): Promise<void> => {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
};

const loadVideoElement = (videoUrl: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const videoElement = document.createElement("video");
    videoElement.src = videoUrl;
    videoElement.muted = true;
    videoElement.preload = "auto";

    videoElement.addEventListener("loadeddata", () => resolve(videoElement), { once: true });
    videoElement.addEventListener("error", () => {
      reject(new Error("Failed to load video for rendering"));
    }, { once: true });

    videoElement.load();
  });
};

const seekVideoToTime = (
  videoElement: HTMLVideoElement,
  timeSeconds: number
): Promise<void> => {
  return new Promise((resolve) => {
    if (Math.abs(videoElement.currentTime - timeSeconds) < 0.01) {
      resolve();
      return;
    }
    videoElement.addEventListener("seeked", () => resolve(), { once: true });
    videoElement.currentTime = timeSeconds;
  });
};

const renderSegmentsSequentially = async (
  segments: TimelineSegment[],
  videoMap: Map<string, SourceVideo>,
  reframeTransforms: Map<string, ReframeTransform>,
  captions: GeneratedCaption[] | undefined,
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  exportPreset: ExportPreset,
  onProgress?: (progress: number) => void,
  abortSignal?: AbortSignal
): Promise<void> => {
  const totalSegments = segments.length;
  const videoElementCache = new Map<string, HTMLVideoElement>();

  for (let index = 0; index < totalSegments; index++) {
    if (abortSignal?.aborted) {
      cleanupVideoCache(videoElementCache);
      throw new Error("Pipeline aborted");
    }

    const segment = segments[index];
    const video = videoMap.get(segment.sourceVideoId);
    const transform = reframeTransforms.get(segment.chunkId);

    if (!video) continue;

    let videoElement = videoElementCache.get(video.id);
    if (!videoElement) {
      videoElement = await loadVideoElement(video.url);
      videoElementCache.set(video.id, videoElement);
    }

    const segmentDuration = segment.endTime - segment.startTime;
    const frameCount = Math.ceil(segmentDuration * exportPreset.fps);

    for (let frame = 0; frame < frameCount; frame++) {
      if (frame % 30 === 0 && abortSignal?.aborted) {
        cleanupVideoCache(videoElementCache);
        throw new Error("Pipeline aborted");
      }

      const frameTime = segment.startTime + frame / exportPreset.fps;
      await seekVideoToTime(videoElement, frameTime);

      if (transform) {
        context.drawImage(
          videoElement,
          transform.cropX,
          transform.cropY,
          transform.cropWidth,
          transform.cropHeight,
          0,
          0,
          canvas.width,
          canvas.height
        );
      } else {
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      }

      if (captions) {
        const currentTime = segment.position + frame / exportPreset.fps;
        renderCaptions(context, captions, currentTime, canvas.width, canvas.height);
      }

      await waitForAnimationFrame();
    }

    if (onProgress) {
      onProgress((index + 1) / totalSegments);
    }
  }

  cleanupVideoCache(videoElementCache);
};

const cleanupVideoCache = (cache: Map<string, HTMLVideoElement>): void => {
  for (const element of cache.values()) {
    element.pause();
    element.src = "";
    element.remove();
  }
  cache.clear();
};

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = context.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const renderCaptions = (
  context: CanvasRenderingContext2D,
  captions: GeneratedCaption[],
  currentTime: number,
  canvasWidth: number,
  canvasHeight: number
): void => {
  const activeCaption = captions.find(
    (caption) =>
      currentTime >= caption.startTime && currentTime <= caption.endTime
  );

  if (!activeCaption) return;

  const fontSize = Math.round(canvasWidth * 0.04);
  context.font = `bold ${fontSize}px Inter, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "bottom";

  const padding = fontSize * 0.4;
  const lineHeight = fontSize * 1.3;
  const maxTextWidth = canvasWidth * 0.85;

  const lines = wrapText(context, activeCaption.text, maxTextWidth);
  const totalTextHeight = lines.length * lineHeight;
  const captionBottomY = canvasHeight * 0.88;
  const captionTopY = captionBottomY - totalTextHeight;

  const longestLineWidth = Math.max(
    ...lines.map((line) => context.measureText(line).width)
  );
  const backgroundWidth = longestLineWidth + padding * 2;
  const backgroundHeight = totalTextHeight + padding * 2;
  const backgroundX = (canvasWidth - backgroundWidth) / 2;
  const backgroundY = captionTopY - padding;
  const borderRadius = fontSize * 0.3;

  context.fillStyle = "rgba(0, 0, 0, 0.7)";
  context.beginPath();
  context.roundRect(
    backgroundX,
    backgroundY,
    backgroundWidth,
    backgroundHeight,
    borderRadius
  );
  context.fill();

  context.fillStyle = "#ffffff";
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const lineY = captionTopY + (lineIndex + 1) * lineHeight;
    context.fillText(lines[lineIndex], canvasWidth / 2, lineY);
  }
};

const audioBufferToBlob = (buffer: AudioBuffer): Blob => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numberOfChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;

  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, headerSize + dataSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = headerSize;
  for (let sample = 0; sample < length; sample++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const clampedValue = Math.max(-1, Math.min(1, channelData[sample]));
      const intValue = clampedValue < 0
        ? clampedValue * 0x8000
        : clampedValue * 0x7FFF;
      view.setInt16(offset, intValue, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
};

const writeString = (
  view: DataView,
  offset: number,
  text: string
): void => {
  for (let index = 0; index < text.length; index++) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
};
