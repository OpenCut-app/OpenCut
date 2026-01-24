import type { SegmentIndexRecord } from "@/types/semantic-search";

interface SegmentTextParts {
  transcriptText: string;
  visualSummary?: string;
  visualTags?: string[];
  keywords?: string[];
}

const sanitizeText = (value: string): string => value.replace(/\s+/g, " ").trim();

const buildSegmentText = ({
  transcriptText,
  visualSummary,
  visualTags,
  keywords,
}: SegmentTextParts): string => {
  const parts: string[] = [transcriptText];

  if (visualSummary) {
    parts.push(visualSummary);
  }

  if (visualTags && visualTags.length > 0) {
    parts.push(visualTags.join(" "));
  }

  if (keywords && keywords.length > 0) {
    parts.push(keywords.join(" "));
  }

  return sanitizeText(parts.join(" "));
};

const buildQualityScore = ({
  transcriptText,
  visualSummary,
  visualTags,
}: SegmentTextParts): number => {
  const transcriptLength = sanitizeText(transcriptText).length;
  const summaryLength = sanitizeText(visualSummary ?? "").length;
  const tagCount = visualTags ? visualTags.length : 0;

  let score = 0.3;

  if (transcriptLength > 0) {
    score += Math.min(0.4, transcriptLength / 300);
  }

  if (summaryLength > 0) {
    score += Math.min(0.2, summaryLength / 200);
  }

  if (tagCount > 0) {
    score += Math.min(0.1, tagCount / 10);
  }

  return Math.min(1, Math.max(0, score));
};

const createSegmentIndexRecord = (
  segment: SegmentIndexRecord,
  overrides: Partial<SegmentIndexRecord> = {}
): SegmentIndexRecord => ({
  ...segment,
  ...overrides,
  transcriptText: sanitizeText(overrides.transcriptText ?? segment.transcriptText),
  visualSummary: overrides.visualSummary ?? segment.visualSummary,
  visualTags: overrides.visualTags ?? segment.visualTags,
  keywords: overrides.keywords ?? segment.keywords,
});

export { buildSegmentText, buildQualityScore, createSegmentIndexRecord };
