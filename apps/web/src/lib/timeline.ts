import { TimelineElement } from "@/types/timeline";

// Helper function to check for element overlaps and prevent invalid timeline states
export const checkElementOverlaps = (elements: TimelineElement[]): boolean => {
  // Sort elements by start time
  const sortedElements = [...elements].sort(
    (a, b) => a.startTime - b.startTime
  );

  for (let i = 0; i < sortedElements.length - 1; i++) {
    const current = sortedElements[i];
    const next = sortedElements[i + 1];

    const currentEnd =
      current.startTime +
      (current.duration - current.trimStart - current.trimEnd);

    // Check if current element overlaps with next element
    if (currentEnd > next.startTime) return true; // Overlap detected
  }

  return false; // No overlaps
};

// Helper function to resolve overlaps by adjusting element positions
export const resolveElementOverlaps = (
  elements: TimelineElement[]
): TimelineElement[] => {
  // Sort elements by start time
  const sortedElements = [...elements].sort(
    (a, b) => a.startTime - b.startTime
  );
  const resolvedElements: TimelineElement[] = [];

  for (let i = 0; i < sortedElements.length; i++) {
    const current = { ...sortedElements[i] };

    if (resolvedElements.length > 0) {
      const previous = resolvedElements[resolvedElements.length - 1];
      const previousEnd =
        previous.startTime +
        (previous.duration - previous.trimStart - previous.trimEnd);

      // If current element would overlap with previous, push it after previous ends
      if (current.startTime < previousEnd) {
        current.startTime = previousEnd;
      }
    }

    resolvedElements.push(current);
  }

  return resolvedElements;
};
