import { generateUUID } from "@/lib/utils";
import type { MediaElement, TimelineTrack } from "@/types/timeline";
import type {
  AutoStitchingSettings,
  MediaTranscript,
  MergedTranscript,
  StitchingPresetName,
  TranscriptCharSpan,
  TranscriptTimelineToken,
  TranscriptToken,
} from "@/types/transcript";

interface TimeRangeSeconds {
  startSeconds: number;
  endSeconds: number;
}

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getEffectiveDurationSeconds = (element: MediaElement): number =>
  Math.max(0, element.duration - element.trimStart - element.trimEnd);

const getElementSourceRangeSeconds = (
  element: MediaElement
): TimeRangeSeconds => ({
  startSeconds: clampNumber(element.trimStart, 0, element.duration),
  endSeconds: clampNumber(element.duration - element.trimEnd, 0, element.duration),
});

const isValidTimeRange = (range: TimeRangeSeconds): boolean =>
  Number.isFinite(range.startSeconds) &&
  Number.isFinite(range.endSeconds) &&
  range.endSeconds > range.startSeconds;

const mergeTimeRanges = (
  ranges: TimeRangeSeconds[],
  mergeGapSeconds: number
): TimeRangeSeconds[] => {
  if (ranges.length === 0) return [];

  const sortedRanges = [...ranges]
    .filter(isValidTimeRange)
    .sort((left, right) => left.startSeconds - right.startSeconds);

  if (sortedRanges.length === 0) return [];

  const merged: TimeRangeSeconds[] = [];
  let current = { ...sortedRanges[0] };

  for (let index = 1; index < sortedRanges.length; index++) {
    const next = sortedRanges[index];
    const shouldMerge = next.startSeconds <= current.endSeconds + mergeGapSeconds;
    if (shouldMerge) {
      current.endSeconds = Math.max(current.endSeconds, next.endSeconds);
      continue;
    }

    merged.push(current);
    current = { ...next };
  }

  merged.push(current);
  return merged;
};

const subtractTimeRanges = (
  baseRanges: TimeRangeSeconds[],
  removeRanges: TimeRangeSeconds[]
): TimeRangeSeconds[] => {
  const normalizedBase = mergeTimeRanges(baseRanges, 0);
  const normalizedRemove = mergeTimeRanges(removeRanges, 0);

  if (normalizedBase.length === 0) return [];
  if (normalizedRemove.length === 0) return normalizedBase;

  const result: TimeRangeSeconds[] = [];
  let removeIndex = 0;

  for (const baseRange of normalizedBase) {
    let cursor = baseRange.startSeconds;

    while (
      removeIndex < normalizedRemove.length &&
      normalizedRemove[removeIndex].endSeconds <= baseRange.startSeconds
    ) {
      removeIndex++;
    }

    let localRemoveIndex = removeIndex;
    while (
      localRemoveIndex < normalizedRemove.length &&
      normalizedRemove[localRemoveIndex].startSeconds < baseRange.endSeconds
    ) {
      const removeRange = normalizedRemove[localRemoveIndex];

      if (removeRange.startSeconds > cursor) {
        result.push({
          startSeconds: cursor,
          endSeconds: Math.min(removeRange.startSeconds, baseRange.endSeconds),
        });
      }

      cursor = Math.max(cursor, removeRange.endSeconds);
      if (cursor >= baseRange.endSeconds) break;

      localRemoveIndex++;
    }

    if (cursor < baseRange.endSeconds) {
      result.push({ startSeconds: cursor, endSeconds: baseRange.endSeconds });
    }
  }

  return result.filter(isValidTimeRange);
};

const normalizeTokenForMatch = (text: string): string =>
  text
    .trim()
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+/gu, "")
    .replace(/[^\p{L}\p{N}]+$/gu, "");

const tokenizeText = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const buildLcsMatrix = (sequenceA: string[], sequenceB: string[]): number[][] => {
  const rows = sequenceA.length + 1;
  const columns = sequenceB.length + 1;

  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => 0)
  );

  for (let row = 1; row < rows; row++) {
    const itemA = sequenceA[row - 1];
    for (let column = 1; column < columns; column++) {
      const itemB = sequenceB[column - 1];

      matrix[row][column] =
        itemA === itemB
          ? matrix[row - 1][column - 1] + 1
          : Math.max(matrix[row - 1][column], matrix[row][column - 1]);
    }
  }

  return matrix;
};

const backtrackLcsMatches = (
  matrix: number[][],
  sequenceA: string[],
  sequenceB: string[]
): Set<number> => {
  const matchedIndices = new Set<number>();
  let row = sequenceA.length;
  let column = sequenceB.length;

  while (row > 0 && column > 0) {
    if (sequenceA[row - 1] === sequenceB[column - 1]) {
      matchedIndices.add(row - 1);
      row--;
      column--;
      continue;
    }

    if (matrix[row - 1][column] >= matrix[row][column - 1]) {
      row--;
    } else {
      column--;
    }
  }

  return matchedIndices;
};

const buildTokenCharSpans = (
  tokens: TranscriptTimelineToken[]
): { text: string; tokenCharSpans: TranscriptCharSpan[] } => {
  let mergedText = "";
  const tokenCharSpans: TranscriptCharSpan[] = [];

  for (const token of tokens) {
    if (mergedText.length > 0) {
      mergedText += " ";
    }

    const startIndex = mergedText.length;
    mergedText += token.text;
    const endIndex = mergedText.length;

    tokenCharSpans.push({
      tokenId: token.id,
      startIndex,
      endIndex,
    });
  }

  return { text: mergedText, tokenCharSpans };
};

const annotateFillerTokens = (
  tokens: TranscriptToken[],
  fillerWords: string[]
): TranscriptToken[] => {
  if (tokens.length === 0) return [];
  if (fillerWords.length === 0) return tokens;

  const normalizedTokenTexts = tokens.map((token) =>
    normalizeTokenForMatch(token.text)
  );

  const patterns = fillerWords
    .map((phrase) =>
      phrase
        .split(/\s+/)
        .map((word) => normalizeTokenForMatch(word))
        .filter((word) => word.length > 0)
    )
    .filter((pattern) => pattern.length > 0);

  const fillerIndexSet = new Set<number>();

  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex++) {
    if (fillerIndexSet.has(tokenIndex)) continue;

    for (const pattern of patterns) {
      if (tokenIndex + pattern.length > tokens.length) continue;

      let matches = true;
      for (let offset = 0; offset < pattern.length; offset++) {
        if (normalizedTokenTexts[tokenIndex + offset] !== pattern[offset]) {
          matches = false;
          break;
        }
      }

      if (!matches) continue;

      for (let offset = 0; offset < pattern.length; offset++) {
        fillerIndexSet.add(tokenIndex + offset);
      }
    }
  }

  if (fillerIndexSet.size === 0) return tokens;

  return tokens.map((token, index) =>
    fillerIndexSet.has(index) ? { ...token, isFiller: true } : token
  );
};

export const DEFAULT_FILLER_WORDS: string[] = [
  "um",
  "uh",
  "erm",
  "like",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "basically",
  "actually",
  "literally",
  "right",
  "okay",
];

export const DEFAULT_AUTO_STITCHING_PRESETS: Record<
  StitchingPresetName,
  AutoStitchingSettings
> = {
  tight: {
    silenceThresholdSeconds: 0.35,
    speechPaddingSeconds: 0.09,
    fillerWordRemovalEnabled: true,
    fillerWords: DEFAULT_FILLER_WORDS,
    fillerPaddingSeconds: 0.08,
    minimumSegmentDurationSeconds: 0.25,
    mergeAdjacentSegmentsWithinSeconds: 0.06,
  },
  balanced: {
    silenceThresholdSeconds: 0.55,
    speechPaddingSeconds: 0.12,
    fillerWordRemovalEnabled: true,
    fillerWords: DEFAULT_FILLER_WORDS,
    fillerPaddingSeconds: 0.06,
    minimumSegmentDurationSeconds: 0.35,
    mergeAdjacentSegmentsWithinSeconds: 0.08,
  },
  loose: {
    silenceThresholdSeconds: 0.9,
    speechPaddingSeconds: 0.15,
    fillerWordRemovalEnabled: false,
    fillerWords: DEFAULT_FILLER_WORDS,
    fillerPaddingSeconds: 0.05,
    minimumSegmentDurationSeconds: 0.5,
    mergeAdjacentSegmentsWithinSeconds: 0.1,
  },
};

export const createMediaTranscriptFromWhisperSegments = ({
  mediaId,
  segments,
  language,
}: {
  mediaId: string;
  segments: WhisperSegment[];
  language?: string;
}): MediaTranscript => {
  const tokens: TranscriptToken[] = [];

  for (const [segmentIndex, segment] of segments.entries()) {
    const normalizedText = segment.text.trim();
    if (normalizedText.length === 0) continue;

    const words = normalizedText.split(/\s+/).filter((word) => word.length > 0);
    if (words.length === 0) continue;

    const segmentStart = Math.max(0, segment.start);
    const segmentEnd = Math.max(segmentStart, segment.end);
    const segmentDuration = Math.max(0.001, segmentEnd - segmentStart);
    const wordDuration = segmentDuration / words.length;

    for (const [wordIndex, word] of words.entries()) {
      const startTimeSeconds = segmentStart + wordIndex * wordDuration;
      const endTimeSeconds =
        wordIndex === words.length - 1
          ? segmentEnd
          : segmentStart + (wordIndex + 1) * wordDuration;

      tokens.push({
        id: `${mediaId}_${segmentIndex}_${wordIndex}_${Math.round(startTimeSeconds * 1000)}`,
        text: word,
        startTimeSeconds,
        endTimeSeconds: Math.max(endTimeSeconds, startTimeSeconds + 0.01),
        confidence: segment.avg_logprob,
      });
    }
  }

  return { mediaId, language, tokens };
};

export const buildMergedTranscript = ({
  tracks,
  transcriptsByMediaId,
}: {
  tracks: TimelineTrack[];
  transcriptsByMediaId: Record<string, MediaTranscript | undefined>;
}): MergedTranscript => {
  const mainTrack = tracks.find((track) => track.isMain);
  const mediaElements = (mainTrack?.elements || [])
    .filter((element): element is MediaElement => element.type === "media")
    .filter((element) => !element.hidden)
    .sort((left, right) => left.startTime - right.startTime);

  const tokens: TranscriptTimelineToken[] = [];
  let durationSeconds = 0;

  for (const element of mediaElements) {
    const transcript = transcriptsByMediaId[element.mediaId];
    if (!transcript || transcript.tokens.length === 0) {
      durationSeconds = Math.max(
        durationSeconds,
        element.startTime + getEffectiveDurationSeconds(element)
      );
      continue;
    }

    const sourceRange = getElementSourceRangeSeconds(element);
    if (!isValidTimeRange(sourceRange)) continue;

    const elementTimelineStartSeconds = element.startTime;

    const tokensInRange = transcript.tokens
      .filter(
        (token) =>
          token.endTimeSeconds > sourceRange.startSeconds &&
          token.startTimeSeconds < sourceRange.endSeconds
      )
      .map((token) => {
        const clippedSourceStart = clampNumber(
          token.startTimeSeconds,
          sourceRange.startSeconds,
          sourceRange.endSeconds
        );
        const clippedSourceEnd = clampNumber(
          token.endTimeSeconds,
          sourceRange.startSeconds,
          sourceRange.endSeconds
        );

        const timelineStartTimeSeconds =
          elementTimelineStartSeconds + (clippedSourceStart - sourceRange.startSeconds);
        const timelineEndTimeSeconds =
          elementTimelineStartSeconds + (clippedSourceEnd - sourceRange.startSeconds);

        if (timelineEndTimeSeconds <= timelineStartTimeSeconds) return null;

        const id = `${element.id}:${token.id}`;

        const mappedToken: TranscriptTimelineToken = {
          id,
          mediaId: element.mediaId,
          elementId: element.id,
          text: token.text,
          confidence: token.confidence,
          isFiller: token.isFiller,
          sourceStartTimeSeconds: clippedSourceStart,
          sourceEndTimeSeconds: clippedSourceEnd,
          timelineStartTimeSeconds,
          timelineEndTimeSeconds,
        };

        return mappedToken;
      })
      .filter((token): token is TranscriptTimelineToken => token !== null)
      .sort(
        (left, right) =>
          left.timelineStartTimeSeconds - right.timelineStartTimeSeconds
      );

    tokens.push(...tokensInRange);

    durationSeconds = Math.max(
      durationSeconds,
      element.startTime + getEffectiveDurationSeconds(element)
    );
  }

  const sortedTokens = [...tokens].sort(
    (left, right) => left.timelineStartTimeSeconds - right.timelineStartTimeSeconds
  );
  const { text, tokenCharSpans } = buildTokenCharSpans(sortedTokens);

  return {
    text,
    tokens: sortedTokens,
    tokenCharSpans,
    durationSeconds,
  };
};

const computeKeepSourceRangesForElement = ({
  element,
  transcript,
  settings,
}: {
  element: MediaElement;
  transcript: MediaTranscript | undefined;
  settings: AutoStitchingSettings;
}): TimeRangeSeconds[] => {
  const sourceRange = getElementSourceRangeSeconds(element);
  if (!isValidTimeRange(sourceRange)) return [];

  if (!transcript || transcript.tokens.length === 0) {
    return [sourceRange];
  }

  const transcriptTokensInRange = transcript.tokens
    .filter(
      (token) =>
        token.endTimeSeconds > sourceRange.startSeconds &&
        token.startTimeSeconds < sourceRange.endSeconds
    )
    .map((token) => ({
      ...token,
      startTimeSeconds: clampNumber(
        token.startTimeSeconds,
        sourceRange.startSeconds,
        sourceRange.endSeconds
      ),
      endTimeSeconds: clampNumber(
        token.endTimeSeconds,
        sourceRange.startSeconds,
        sourceRange.endSeconds
      ),
    }))
    .filter((token) => token.endTimeSeconds > token.startTimeSeconds);

  if (transcriptTokensInRange.length === 0) {
    return [sourceRange];
  }

  const tokensWithFillers =
    settings.fillerWordRemovalEnabled && settings.fillerWords.length > 0
      ? annotateFillerTokens(transcriptTokensInRange, settings.fillerWords)
      : transcriptTokensInRange;

  const speechRanges = tokensWithFillers.map((token) => ({
    startSeconds: clampNumber(
      token.startTimeSeconds - settings.speechPaddingSeconds,
      sourceRange.startSeconds,
      sourceRange.endSeconds
    ),
    endSeconds: clampNumber(
      token.endTimeSeconds + settings.speechPaddingSeconds,
      sourceRange.startSeconds,
      sourceRange.endSeconds
    ),
  }));

  const mergedSpeechRanges = mergeTimeRanges(
    speechRanges,
    settings.silenceThresholdSeconds
  );

  const fillerRanges =
    settings.fillerWordRemovalEnabled && tokensWithFillers.some((t) => t.isFiller)
      ? mergeTimeRanges(
          tokensWithFillers
            .filter((token) => token.isFiller)
            .map((token) => ({
              startSeconds: clampNumber(
                token.startTimeSeconds - settings.fillerPaddingSeconds,
                sourceRange.startSeconds,
                sourceRange.endSeconds
              ),
              endSeconds: clampNumber(
                token.endTimeSeconds + settings.fillerPaddingSeconds,
                sourceRange.startSeconds,
                sourceRange.endSeconds
              ),
            })),
          0
        )
      : [];

  const afterFillerRemoval =
    fillerRanges.length > 0
      ? subtractTimeRanges(mergedSpeechRanges, fillerRanges)
      : mergedSpeechRanges;

  const mergedAfterRemoval = mergeTimeRanges(
    afterFillerRemoval,
    settings.mergeAdjacentSegmentsWithinSeconds
  );

  const keepRanges = mergedAfterRemoval.filter(
    (range) =>
      range.endSeconds - range.startSeconds >= settings.minimumSegmentDurationSeconds
  );

  return keepRanges.length > 0 ? keepRanges : [sourceRange];
};

const stripSplitSuffix = (name: string): string =>
  name.replace(/ \(split \d+\)$/i, "");

export const autoStitchMainTrack = ({
  tracks,
  transcriptsByMediaId,
  settings,
}: {
  tracks: TimelineTrack[];
  transcriptsByMediaId: Record<string, MediaTranscript | undefined>;
  settings: AutoStitchingSettings;
}): MediaElement[] => {
  const mainTrack = tracks.find((track) => track.isMain);
  const sourceElements = (mainTrack?.elements || [])
    .filter((element): element is MediaElement => element.type === "media")
    .filter((element) => !element.hidden)
    .sort((left, right) => left.startTime - right.startTime);

  if (sourceElements.length === 0) return [];

  const baseStartTimeSeconds = sourceElements[0].startTime;
  let currentStartTimeSeconds = baseStartTimeSeconds;
  const stitchedElements: MediaElement[] = [];

  for (const element of sourceElements) {
    const transcript = transcriptsByMediaId[element.mediaId];
    const keepRanges = computeKeepSourceRangesForElement({
      element,
      transcript,
      settings,
    });

    const totalSplits = keepRanges.length;
    const baseName = stripSplitSuffix(element.name);

    for (const [splitIndex, keepRange] of keepRanges.entries()) {
      const newTrimStart = keepRange.startSeconds;
      const newTrimEnd = element.duration - keepRange.endSeconds;
      const segmentDurationSeconds = Math.max(
        0,
        element.duration - newTrimStart - newTrimEnd
      );

      if (segmentDurationSeconds <= 0) continue;

      stitchedElements.push({
        ...element,
        id: generateUUID(),
        name:
          totalSplits > 1 ? `${baseName} (split ${splitIndex + 1})` : baseName,
        startTime: currentStartTimeSeconds,
        trimStart: newTrimStart,
        trimEnd: newTrimEnd,
      });

      currentStartTimeSeconds += segmentDurationSeconds;
    }
  }

  return stitchedElements.sort((left, right) => left.startTime - right.startTime);
};

const buildRemovedBeforeLookup = (
  cutRanges: TimeRangeSeconds[]
): ((timeSeconds: number) => number) => {
  const normalized = mergeTimeRanges(cutRanges, 0);
  const prefixEnds: number[] = [];
  const prefixRemoved: number[] = [];

  let removedTotal = 0;
  for (const range of normalized) {
    removedTotal += range.endSeconds - range.startSeconds;
    prefixEnds.push(range.endSeconds);
    prefixRemoved.push(removedTotal);
  }

  return (timeSeconds: number) => {
    let low = 0;
    let high = prefixEnds.length - 1;
    let bestIndex = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (prefixEnds[mid] <= timeSeconds) {
        bestIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return bestIndex >= 0 ? prefixRemoved[bestIndex] : 0;
  };
};

export const applyRippleCutsToMainTrack = ({
  tracks,
  cutRanges,
}: {
  tracks: TimelineTrack[];
  cutRanges: TimeRangeSeconds[];
}): MediaElement[] => {
  const normalizedCuts = mergeTimeRanges(cutRanges, 0);
  if (normalizedCuts.length === 0) {
    const mainTrack = tracks.find((track) => track.isMain);
    return (mainTrack?.elements || []).filter(
      (element): element is MediaElement => element.type === "media"
    );
  }

  const removedBefore = buildRemovedBeforeLookup(normalizedCuts);
  const mainTrack = tracks.find((track) => track.isMain);
  const elements = (mainTrack?.elements || [])
    .filter((element): element is MediaElement => element.type === "media")
    .filter((element) => !element.hidden)
    .sort((left, right) => left.startTime - right.startTime);

  const updatedElements: MediaElement[] = [];
  let cutIndex = 0;

  for (const element of elements) {
    const effectiveStartSeconds = element.startTime;
    const effectiveDurationSeconds = getEffectiveDurationSeconds(element);
    const effectiveEndSeconds = effectiveStartSeconds + effectiveDurationSeconds;

    while (
      cutIndex < normalizedCuts.length &&
      normalizedCuts[cutIndex].endSeconds <= effectiveStartSeconds
    ) {
      cutIndex++;
    }

    let cursorSeconds = effectiveStartSeconds;
    let localCutIndex = cutIndex;
    const keptTimelineRanges: TimeRangeSeconds[] = [];

    while (
      localCutIndex < normalizedCuts.length &&
      normalizedCuts[localCutIndex].startSeconds < effectiveEndSeconds
    ) {
      const cut = normalizedCuts[localCutIndex];
      const keepEnd = Math.min(cut.startSeconds, effectiveEndSeconds);

      if (keepEnd > cursorSeconds) {
        keptTimelineRanges.push({ startSeconds: cursorSeconds, endSeconds: keepEnd });
      }

      cursorSeconds = Math.max(cursorSeconds, cut.endSeconds);
      if (cursorSeconds >= effectiveEndSeconds) break;

      localCutIndex++;
    }

    if (cursorSeconds < effectiveEndSeconds) {
      keptTimelineRanges.push({
        startSeconds: cursorSeconds,
        endSeconds: effectiveEndSeconds,
      });
    }

    const totalSplits = keptTimelineRanges.length;
    const baseName = stripSplitSuffix(element.name);

    for (const [splitIndex, keepRange] of keptTimelineRanges.entries()) {
      if (!isValidTimeRange(keepRange)) continue;

      const removedDelta = removedBefore(keepRange.startSeconds);
      const newStartTimeSeconds = Math.max(0, keepRange.startSeconds - removedDelta);

      const elementOffsetStart = keepRange.startSeconds - element.startTime;
      const elementOffsetEnd = keepRange.endSeconds - element.startTime;

      const newTrimStart = element.trimStart + elementOffsetStart;
      const newSourceEnd = element.trimStart + elementOffsetEnd;
      const newTrimEnd = element.duration - newSourceEnd;

      const newEffectiveDurationSeconds = Math.max(
        0,
        element.duration - newTrimStart - newTrimEnd
      );

      if (newEffectiveDurationSeconds <= 0) continue;

      updatedElements.push({
        ...element,
        id: generateUUID(),
        name:
          totalSplits > 1 ? `${baseName} (split ${splitIndex + 1})` : baseName,
        startTime: newStartTimeSeconds,
        trimStart: newTrimStart,
        trimEnd: newTrimEnd,
      });
    }
  }

  return updatedElements.sort((left, right) => left.startTime - right.startTime);
};

export const computeCutRangesForDeletedTokens = ({
  mergedTranscript,
  deletedTokenIds,
  paddingSeconds,
}: {
  mergedTranscript: MergedTranscript;
  deletedTokenIds: string[];
  paddingSeconds: number;
}): TimeRangeSeconds[] => {
  if (deletedTokenIds.length === 0) return [];

  const deletionSet = new Set(deletedTokenIds);
  const elementBounds = new Map<string, TimeRangeSeconds>();

  for (const token of mergedTranscript.tokens) {
    const existing = elementBounds.get(token.elementId);
    if (!existing) {
      elementBounds.set(token.elementId, {
        startSeconds: token.timelineStartTimeSeconds,
        endSeconds: token.timelineEndTimeSeconds,
      });
      continue;
    }

    existing.startSeconds = Math.min(
      existing.startSeconds,
      token.timelineStartTimeSeconds
    );
    existing.endSeconds = Math.max(existing.endSeconds, token.timelineEndTimeSeconds);
  }

  const rawRanges = mergedTranscript.tokens
    .filter((token) => deletionSet.has(token.id))
    .map((token) => {
      const bounds = elementBounds.get(token.elementId);
      const paddedStart = Math.max(0, token.timelineStartTimeSeconds - paddingSeconds);
      const paddedEnd = token.timelineEndTimeSeconds + paddingSeconds;

      const startSeconds = bounds
        ? Math.max(paddedStart, bounds.startSeconds)
        : paddedStart;
      const endSeconds = bounds ? Math.min(paddedEnd, bounds.endSeconds) : paddedEnd;

      return { startSeconds, endSeconds };
    })
    .filter(isValidTimeRange);

  return mergeTimeRanges(rawRanges, 0);
};

export const computeDeletedTokenIdsFromUpdatedText = ({
  mergedTranscript,
  updatedText,
}: {
  mergedTranscript: MergedTranscript;
  updatedText: string;
}):
  | { success: true; deletedTokenIds: string[] }
  | { success: false; error: string } => {
  const originalTokens = mergedTranscript.tokens.map((token) =>
    normalizeTokenForMatch(token.text)
  );
  const updatedTokens = tokenizeText(updatedText).map(normalizeTokenForMatch);

  const originalNormalized = originalTokens.filter((token) => token.length > 0);
  const updatedNormalized = updatedTokens.filter((token) => token.length > 0);

  if (updatedNormalized.length === 0 && originalNormalized.length === 0) {
    return { success: true, deletedTokenIds: [] };
  }

  const lcsMatrix = buildLcsMatrix(originalNormalized, updatedNormalized);
  const lcsLength = lcsMatrix[originalNormalized.length][updatedNormalized.length];

  if (lcsLength !== updatedNormalized.length) {
    return {
      success: false,
      error: "Transcript edits must be deletions only (no insertions).",
    };
  }

  const matchedIndices = backtrackLcsMatches(
    lcsMatrix,
    originalNormalized,
    updatedNormalized
  );

  const deletedTokenIds: string[] = [];
  let normalizedIndex = 0;

  for (const token of mergedTranscript.tokens) {
    const normalized = normalizeTokenForMatch(token.text);
    if (normalized.length === 0) continue;

    if (!matchedIndices.has(normalizedIndex)) {
      deletedTokenIds.push(token.id);
    }
    normalizedIndex++;
  }

  return { success: true, deletedTokenIds };
};
