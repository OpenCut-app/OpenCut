import type { ChunkingOptions, TranscriptSegment, TranscriptToken } from "@/types/semantic-search";

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  minSegmentDurationSeconds: 6,
  maxSegmentDurationSeconds: 22,
  pauseThresholdSeconds: 1.2,
  maxTokensPerSegment: 120,
};

const isSentenceBoundary = (tokenText: string): boolean => {
  const trimmedText = tokenText.trim();
  return trimmedText.endsWith(".") || trimmedText.endsWith("?") || trimmedText.endsWith("!");
};

const buildSegmentTranscript = (tokens: TranscriptToken[]): string =>
  tokens.map((token) => token.text).join(" ").replace(/\s+/g, " ").trim();

const shouldCloseSegment = ({
  segmentTokens,
  currentToken,
  nextToken,
  options,
  segmentStartTimeSeconds,
}: {
  segmentTokens: TranscriptToken[];
  currentToken: TranscriptToken;
  nextToken: TranscriptToken | undefined;
  options: ChunkingOptions;
  segmentStartTimeSeconds: number;
}): boolean => {
  const segmentDurationSeconds = currentToken.endTimeSeconds - segmentStartTimeSeconds;
  const tokenCount = segmentTokens.length;
  const hasSentenceBoundary = isSentenceBoundary(currentToken.text);

  if (segmentDurationSeconds >= options.maxSegmentDurationSeconds) {
    return true;
  }

  if (tokenCount >= options.maxTokensPerSegment) {
    return true;
  }

  if (!nextToken) {
    return segmentDurationSeconds >= options.minSegmentDurationSeconds;
  }

  const pauseDurationSeconds = nextToken.startTimeSeconds - currentToken.endTimeSeconds;
  const hasLongPause = pauseDurationSeconds >= options.pauseThresholdSeconds;

  if (segmentDurationSeconds < options.minSegmentDurationSeconds) {
    return false;
  }

  return hasSentenceBoundary || hasLongPause;
};

const chunkTranscript = (
  tokens: TranscriptToken[],
  chunkingOptions: Partial<ChunkingOptions> = {}
): TranscriptSegment[] => {
  const options = { ...DEFAULT_CHUNKING_OPTIONS, ...chunkingOptions };
  const segments: TranscriptSegment[] = [];

  if (tokens.length === 0) {
    return segments;
  }

  let segmentTokens: TranscriptToken[] = [];
  let segmentStartTimeSeconds = tokens[0].startTimeSeconds;

  tokens.forEach((token, index) => {
    if (segmentTokens.length === 0) {
      segmentStartTimeSeconds = token.startTimeSeconds;
    }

    segmentTokens.push(token);

    const nextToken = tokens[index + 1];
    const shouldEndSegment = shouldCloseSegment({
      segmentTokens,
      currentToken: token,
      nextToken,
      options,
      segmentStartTimeSeconds,
    });

    if (!shouldEndSegment) {
      return;
    }

    const transcriptText = buildSegmentTranscript(segmentTokens);
    if (transcriptText.length > 0) {
      segments.push({
        startTimeSeconds: segmentStartTimeSeconds,
        endTimeSeconds: token.endTimeSeconds,
        transcriptText,
      });
    }

    segmentTokens = [];
  });

  if (segmentTokens.length > 0) {
    const lastToken = segmentTokens[segmentTokens.length - 1];
    const transcriptText = buildSegmentTranscript(segmentTokens);

    if (transcriptText.length > 0) {
      segments.push({
        startTimeSeconds: segmentStartTimeSeconds,
        endTimeSeconds: lastToken.endTimeSeconds,
        transcriptText,
      });
    }
  }

  return segments;
};

export { chunkTranscript };
