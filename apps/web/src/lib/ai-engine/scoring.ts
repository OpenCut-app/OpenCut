import type {
  VideoChunk,
  ChunkAnalysis,
  ChunkScore,
  ScoringWeights,
  PruningConstraints,
} from "@/types/ai-engine";

interface ScoringResult {
  scores: ChunkScore[];
  selectedChunkIds: string[];
  totalSelectedDuration: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  relevance: 0.35,
  quality: 0.25,
  narrativeContinuity: 0.25,
  energyBoost: 0.1,
  hookBonus: 0.05,
};

const DEFAULT_CONSTRAINTS: PruningConstraints = {
  minimumCoreIdeas: 1,
  maximumNarrativeGap: 3,
  minimumOutputDuration: 30,
  maximumOutputDuration: 90,
  avoidAbruptJumps: true,
};

export const scoreAndPruneChunks = (
  chunks: VideoChunk[],
  analyses: ChunkAnalysis[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
  constraints: PruningConstraints = DEFAULT_CONSTRAINTS
): ScoringResult => {
  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.chunkId, analysis])
  );

  const rawScores = chunks.map((chunk, index) => {
    const analysis = analysisMap.get(chunk.id);
    return computeChunkScore(chunk, analysis, index, chunks.length, weights);
  });

  const prunedScores = applyPruningConstraints(
    rawScores,
    chunks,
    analyses,
    constraints
  );

  const selectedChunkIds = prunedScores
    .filter((score) => score.isSelected)
    .map((score) => score.chunkId);

  const selectedChunks = chunks.filter((chunk) =>
    selectedChunkIds.includes(chunk.id)
  );

  const totalSelectedDuration = selectedChunks.reduce(
    (sum, chunk) => sum + chunk.duration,
    0
  );

  return {
    scores: prunedScores,
    selectedChunkIds,
    totalSelectedDuration,
  };
};

const computeChunkScore = (
  chunk: VideoChunk,
  analysis: ChunkAnalysis | undefined,
  chunkIndex: number,
  totalChunks: number,
  weights: ScoringWeights
): ChunkScore => {
  if (!analysis) {
    return {
      chunkId: chunk.id,
      relevanceScore: 0.3,
      qualityScore: 0.3,
      narrativeContinuityScore: 0.5,
      compositeScore: 0.3,
      isSelected: false,
      exclusionReason: "No analysis data available",
    };
  }

  const relevanceScore = computeRelevanceScore(analysis);
  const qualityScore = computeQualityScore(analysis);
  const narrativeContinuityScore = computeContinuityScore(
    analysis,
    chunkIndex,
    totalChunks
  );
  const energyBoost = analysis.energyScore * weights.energyBoost;
  const hookBonus = computeHookBonus(chunkIndex, totalChunks, analysis);

  const compositeScore =
    relevanceScore * weights.relevance +
    qualityScore * weights.quality +
    narrativeContinuityScore * weights.narrativeContinuity +
    energyBoost +
    hookBonus * weights.hookBonus;

  return {
    chunkId: chunk.id,
    relevanceScore,
    qualityScore,
    narrativeContinuityScore,
    compositeScore: Math.min(1, Math.max(0, compositeScore)),
    isSelected: true,
  };
};

const computeRelevanceScore = (analysis: ChunkAnalysis): number => {
  let score = 0;

  if (analysis.isFillerContent) {
    score -= 0.4;
  }

  if (analysis.hasSilence) {
    score -= 0.3;
  }

  if (analysis.keywords.length > 0) {
    score += Math.min(0.3, analysis.keywords.length * 0.05);
  }

  if (analysis.semanticTopics.length > 0) {
    const topTopicScore = Math.max(
      ...analysis.semanticTopics.map((topic) => topic.relevanceScore)
    );
    score += topTopicScore * 0.4;
  }

  if (analysis.speakingConfidence > 0.7) {
    score += 0.2;
  }

  return Math.min(1, Math.max(0, score + 0.5));
};

const computeQualityScore = (analysis: ChunkAnalysis): number => {
  const visualWeight = 0.6;
  const audioWeight = 0.4;

  const audioScore = analysis.hasSilence
    ? 0.2
    : analysis.speakingConfidence * 0.7 + 0.3;

  return analysis.visualQualityScore * visualWeight + audioScore * audioWeight;
};

const computeContinuityScore = (
  analysis: ChunkAnalysis,
  chunkIndex: number,
  totalChunks: number
): number => {
  const positionRatio = chunkIndex / Math.max(1, totalChunks - 1);

  let continuityBonus = 0;

  if (analysis.semanticTopics.length > 0) {
    continuityBonus += 0.2;
  }

  if (analysis.transcript.length > 0) {
    continuityBonus += 0.2;
  }

  if (analysis.sceneType === "talking-head" || analysis.sceneType === "interview") {
    continuityBonus += 0.1;
  }

  const positionPenalty =
    positionRatio > 0.1 && positionRatio < 0.9 ? 0 : -0.05;

  return Math.min(1, Math.max(0, 0.5 + continuityBonus + positionPenalty));
};

const computeHookBonus = (
  chunkIndex: number,
  totalChunks: number,
  analysis: ChunkAnalysis
): number => {
  const isNearStart = chunkIndex < Math.max(3, totalChunks * 0.1);
  const isNearEnd = chunkIndex > totalChunks * 0.9;

  if (isNearStart && analysis.energyScore > 0.6) {
    return 1.0;
  }

  if (isNearEnd && analysis.energyScore > 0.5) {
    return 0.7;
  }

  return 0;
};

const applyPruningConstraints = (
  scores: ChunkScore[],
  chunks: VideoChunk[],
  analyses: ChunkAnalysis[],
  constraints: PruningConstraints
): ChunkScore[] => {
  const sortedScores = [...scores].sort(
    (scoreA, scoreB) => scoreB.compositeScore - scoreA.compositeScore
  );

  const chunkMap = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.chunkId, analysis])
  );

  let accumulatedDuration = 0;
  const selectedChunkIds = new Set<string>();
  const updatedScores = [...scores];

  for (const score of sortedScores) {
    const chunk = chunkMap.get(score.chunkId);
    if (!chunk) continue;

    if (accumulatedDuration >= constraints.maximumOutputDuration) {
      markAsExcluded(updatedScores, score.chunkId, "Exceeds maximum duration");
      continue;
    }

    const analysis = analysisMap.get(score.chunkId);
    if (analysis?.isFillerContent && score.compositeScore < 0.4) {
      markAsExcluded(updatedScores, score.chunkId, "Low-quality filler content");
      continue;
    }

    if (analysis?.hasSilence && analysis.speakingConfidence < 0.2) {
      markAsExcluded(updatedScores, score.chunkId, "Extended silence");
      continue;
    }

    if (
      constraints.avoidAbruptJumps &&
      selectedChunkIds.size > 0 &&
      hasNarrativeJump(score.chunkId, selectedChunkIds, chunks, constraints)
    ) {
      markAsExcluded(updatedScores, score.chunkId, "Would cause narrative jump");
      continue;
    }

    selectedChunkIds.add(score.chunkId);
    accumulatedDuration += chunk.duration - chunk.overlapPrevious;
  }

  if (accumulatedDuration < constraints.minimumOutputDuration) {
    ensureMinimumDuration(
      updatedScores,
      chunks,
      selectedChunkIds,
      constraints.minimumOutputDuration,
      accumulatedDuration
    );
  }

  ensureCoreIdeas(
    updatedScores,
    chunks,
    analyses,
    selectedChunkIds,
    constraints.minimumCoreIdeas
  );

  return updatedScores;
};

const markAsExcluded = (
  scores: ChunkScore[],
  chunkId: string,
  reason: string
): void => {
  const scoreIndex = scores.findIndex((score) => score.chunkId === chunkId);
  if (scoreIndex >= 0) {
    scores[scoreIndex] = {
      ...scores[scoreIndex],
      isSelected: false,
      exclusionReason: reason,
    };
  }
};

const hasNarrativeJump = (
  candidateChunkId: string,
  selectedIds: Set<string>,
  chunks: VideoChunk[],
  constraints: PruningConstraints
): boolean => {
  const candidateChunk = chunks.find((chunk) => chunk.id === candidateChunkId);
  if (!candidateChunk) return false;

  const selectedChunks = chunks.filter((chunk) => selectedIds.has(chunk.id));

  for (const selected of selectedChunks) {
    if (selected.sourceVideoId !== candidateChunk.sourceVideoId) continue;

    const timeGap = Math.abs(candidateChunk.startTime - selected.endTime);
    if (
      timeGap > constraints.maximumNarrativeGap &&
      timeGap < candidateChunk.duration * 5
    ) {
      return true;
    }
  }

  return false;
};

const ensureMinimumDuration = (
  scores: ChunkScore[],
  chunks: VideoChunk[],
  selectedIds: Set<string>,
  minimumDuration: number,
  currentDuration: number
): void => {
  const unselectedScores = scores
    .filter((score) => !score.isSelected && !selectedIds.has(score.chunkId))
    .sort((scoreA, scoreB) => scoreB.compositeScore - scoreA.compositeScore);

  let runningDuration = currentDuration;

  for (const score of unselectedScores) {
    if (runningDuration >= minimumDuration) break;

    const chunk = chunks.find((chunkItem) => chunkItem.id === score.chunkId);
    if (!chunk) continue;

    const scoreIndex = scores.findIndex(
      (scoreItem) => scoreItem.chunkId === score.chunkId
    );
    if (scoreIndex >= 0) {
      scores[scoreIndex] = {
        ...scores[scoreIndex],
        isSelected: true,
        exclusionReason: undefined,
      };
      selectedIds.add(score.chunkId);
      runningDuration += chunk.duration;
    }
  }
};

const ensureCoreIdeas = (
  scores: ChunkScore[],
  chunks: VideoChunk[],
  analyses: ChunkAnalysis[],
  selectedIds: Set<string>,
  minimumCoreIdeas: number
): void => {
  const analysisMap = new Map(
    analyses.map((analysis) => [analysis.chunkId, analysis])
  );

  const selectedWithTopics = [...selectedIds].filter((chunkId) => {
    const analysis = analysisMap.get(chunkId);
    return analysis && analysis.semanticTopics.length > 0;
  });

  if (selectedWithTopics.length >= minimumCoreIdeas) return;

  const unselectedWithTopics = scores
    .filter((score) => {
      if (selectedIds.has(score.chunkId)) return false;
      const analysis = analysisMap.get(score.chunkId);
      return analysis && analysis.semanticTopics.length > 0;
    })
    .sort((scoreA, scoreB) => scoreB.compositeScore - scoreA.compositeScore);

  const needed = minimumCoreIdeas - selectedWithTopics.length;

  for (let index = 0; index < Math.min(needed, unselectedWithTopics.length); index++) {
    const score = unselectedWithTopics[index];
    const scoreIndex = scores.findIndex(
      (scoreItem) => scoreItem.chunkId === score.chunkId
    );
    if (scoreIndex >= 0) {
      scores[scoreIndex] = {
        ...scores[scoreIndex],
        isSelected: true,
        exclusionReason: undefined,
      };
      selectedIds.add(score.chunkId);
    }
  }
};
