import { generateUUID } from "@/lib/utils";
import type {
  VideoChunk,
  ChunkAnalysis,
  ChunkScore,
  SynthesizedTimeline,
  TimelineSegment,
  EditTransition,
} from "@/types/ai-engine";

interface SynthesisOptions {
  targetDurationSeconds: number;
  hookDurationSeconds: number;
  closingDurationSeconds: number;
  minimumSegmentDuration: number;
  transitionDuration: number;
}

const DEFAULT_SYNTHESIS_OPTIONS: SynthesisOptions = {
  targetDurationSeconds: 60,
  hookDurationSeconds: 5,
  closingDurationSeconds: 5,
  minimumSegmentDuration: 1.5,
  transitionDuration: 0.3,
};

export const synthesizeTimeline = (
  chunks: VideoChunk[],
  analyses: ChunkAnalysis[],
  scores: ChunkScore[],
  options: Partial<SynthesisOptions> = {}
): SynthesizedTimeline => {
  const mergedOptions = { ...DEFAULT_SYNTHESIS_OPTIONS, ...options };

  const selectedScores = scores
    .filter((score) => score.isSelected)
    .sort((scoreA, scoreB) => scoreB.compositeScore - scoreA.compositeScore);

  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.chunkId, analysis])
  );

  const selectedChunks = selectedScores
    .map((score) => ({
      chunk: chunkMap.get(score.chunkId),
      score,
      analysis: analysisMap.get(score.chunkId),
    }))
    .filter(
      (entry) => entry.chunk !== undefined
    ) as Array<{
      chunk: VideoChunk;
      score: ChunkScore;
      analysis: ChunkAnalysis | undefined;
    }>;

  const orderedChunks = orderChunksForNarrative(selectedChunks, mergedOptions);

  const segments = buildTimelineSegments(orderedChunks, mergedOptions);

  const hookSegmentId = identifyHookSegment(segments);
  const closingSegmentId = identifyClosingSegment(segments);

  const totalDuration = segments.reduce(
    (sum, segment) => Math.max(sum, segment.position + (segment.endTime - segment.startTime)),
    0
  );

  return {
    id: generateUUID(),
    segments,
    totalDuration,
    hookSegmentId,
    closingSegmentId,
  };
};

const orderChunksForNarrative = (
  selectedChunks: Array<{
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  }>,
  options: SynthesisOptions
): Array<{
  chunk: VideoChunk;
  score: ChunkScore;
  analysis: ChunkAnalysis | undefined;
}> => {
  if (selectedChunks.length === 0) return [];

  const hookCandidates = selectedChunks.filter(
    (entry) =>
      entry.analysis &&
      entry.analysis.energyScore > 0.6 &&
      entry.chunk.duration <= options.hookDurationSeconds * 1.5
  );

  const closingCandidates = selectedChunks.filter(
    (entry) =>
      entry.analysis &&
      (entry.analysis.emotionCategory === "inspirational" ||
        entry.analysis.energyScore > 0.5)
  );

  const hookSegment =
    hookCandidates.length > 0
      ? hookCandidates.sort(
          (entryA, entryB) => entryB.score.compositeScore - entryA.score.compositeScore
        )[0]
      : selectedChunks[0];

  const closingSegment =
    closingCandidates.length > 0
      ? closingCandidates.filter(
          (entry) => entry.chunk.id !== hookSegment.chunk.id
        )[0] || selectedChunks[selectedChunks.length - 1]
      : selectedChunks[selectedChunks.length - 1];

  const middleSegments = selectedChunks.filter(
    (entry) =>
      entry.chunk.id !== hookSegment.chunk.id &&
      entry.chunk.id !== closingSegment.chunk.id
  );

  const sortedMiddle = sortByNarrativeFlow(middleSegments);

  return [hookSegment, ...sortedMiddle, closingSegment];
};

const sortByNarrativeFlow = (
  segments: Array<{
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  }>
): Array<{
  chunk: VideoChunk;
  score: ChunkScore;
  analysis: ChunkAnalysis | undefined;
}> => {
  const grouped = new Map<
    string,
    Array<{
      chunk: VideoChunk;
      score: ChunkScore;
      analysis: ChunkAnalysis | undefined;
    }>
  >();

  for (const segment of segments) {
    const sourceId = segment.chunk.sourceVideoId;
    const existing = grouped.get(sourceId) || [];
    existing.push(segment);
    grouped.set(sourceId, existing);
  }

  for (const [sourceId, group] of grouped) {
    grouped.set(
      sourceId,
      group.sort(
        (entryA, entryB) => entryA.chunk.startTime - entryB.chunk.startTime
      )
    );
  }

  const result: Array<{
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  }> = [];

  const sourceIds = [...grouped.keys()];
  const sourceIndices = new Map(sourceIds.map((sourceId) => [sourceId, 0]));

  let lastSourceId = "";
  let consecutiveFromSame = 0;
  const maxConsecutive = 2;

  while (result.length < segments.length) {
    let bestCandidate:
      | {
          chunk: VideoChunk;
          score: ChunkScore;
          analysis: ChunkAnalysis | undefined;
        }
      | undefined;
    let bestSourceId = "";
    let bestScore = -1;

    for (const sourceId of sourceIds) {
      const currentIndex = sourceIndices.get(sourceId) || 0;
      const group = grouped.get(sourceId) || [];

      if (currentIndex >= group.length) continue;

      const candidate = group[currentIndex];
      let adjustedScore = candidate.score.compositeScore;

      if (sourceId === lastSourceId && consecutiveFromSame >= maxConsecutive) {
        adjustedScore *= 0.5;
      }

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestCandidate = candidate;
        bestSourceId = sourceId;
      }
    }

    if (!bestCandidate) break;

    if (bestSourceId === lastSourceId) {
      consecutiveFromSame++;
    } else {
      consecutiveFromSame = 1;
      lastSourceId = bestSourceId;
    }

    result.push(bestCandidate);
    sourceIndices.set(bestSourceId, (sourceIndices.get(bestSourceId) || 0) + 1);
  }

  return result;
};

const buildTimelineSegments = (
  orderedChunks: Array<{
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  }>,
  options: SynthesisOptions
): TimelineSegment[] => {
  const segments: TimelineSegment[] = [];
  let currentPosition = 0;

  for (let index = 0; index < orderedChunks.length; index++) {
    const { chunk } = orderedChunks[index];
    const nextEntry = orderedChunks[index + 1];

    const segmentDuration = chunk.endTime - chunk.startTime;
    if (segmentDuration < options.minimumSegmentDuration) continue;

    let transition: EditTransition | undefined;
    if (nextEntry) {
      transition = determineTransition(
        orderedChunks[index],
        nextEntry,
        options.transitionDuration
      );
    }

    segments.push({
      chunkId: chunk.id,
      sourceVideoId: chunk.sourceVideoId,
      startTime: chunk.startTime,
      endTime: chunk.endTime,
      trimStart: 0,
      trimEnd: 0,
      position: currentPosition,
      transition,
    });

    currentPosition += segmentDuration;

    if (currentPosition >= options.targetDurationSeconds) break;
  }

  return segments;
};

const determineTransition = (
  currentEntry: {
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  },
  nextEntry: {
    chunk: VideoChunk;
    score: ChunkScore;
    analysis: ChunkAnalysis | undefined;
  },
  transitionDuration: number
): EditTransition => {
  const isSameSource =
    currentEntry.chunk.sourceVideoId === nextEntry.chunk.sourceVideoId;
  const isContiguous =
    isSameSource &&
    Math.abs(currentEntry.chunk.endTime - nextEntry.chunk.startTime) < 1;

  if (isContiguous) {
    return {
      type: "cut",
      duration: 0,
      fromChunkId: currentEntry.chunk.id,
      toChunkId: nextEntry.chunk.id,
    };
  }

  const currentEnergy = currentEntry.analysis?.energyScore || 0.5;
  const nextEnergy = nextEntry.analysis?.energyScore || 0.5;
  const energyDifference = Math.abs(currentEnergy - nextEnergy);

  if (energyDifference > 0.4) {
    return {
      type: "cut",
      duration: 0,
      fromChunkId: currentEntry.chunk.id,
      toChunkId: nextEntry.chunk.id,
    };
  }

  const currentScene = currentEntry.analysis?.sceneType;
  const nextScene = nextEntry.analysis?.sceneType;
  const isSceneChange = currentScene !== nextScene;

  if (isSceneChange) {
    return {
      type: "crossfade",
      duration: transitionDuration,
      fromChunkId: currentEntry.chunk.id,
      toChunkId: nextEntry.chunk.id,
    };
  }

  if (nextEnergy > currentEnergy + 0.2) {
    return {
      type: "zoom-in",
      duration: transitionDuration * 0.8,
      fromChunkId: currentEntry.chunk.id,
      toChunkId: nextEntry.chunk.id,
    };
  }

  return {
    type: "cut",
    duration: 0,
    fromChunkId: currentEntry.chunk.id,
    toChunkId: nextEntry.chunk.id,
  };
};

const identifyHookSegment = (
  segments: TimelineSegment[]
): string | undefined => {
  if (segments.length === 0) return undefined;
  return segments[0].chunkId;
};

const identifyClosingSegment = (
  segments: TimelineSegment[]
): string | undefined => {
  if (segments.length === 0) return undefined;
  return segments[segments.length - 1].chunkId;
};
