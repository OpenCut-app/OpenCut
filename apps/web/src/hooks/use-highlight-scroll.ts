import { useEffect, useState, useRef } from "react";

/**
 * Tracks and applies a temporary highlight to an element by id: scrolls it into view and clears the highlight after a timeout.
 *
 * @param highlightId - The id of the element to highlight; pass `null` to skip highlighting.
 * @param onClearHighlight - Callback invoked when the highlight duration ends and the highlight is cleared.
 * @param highlightDuration - Time in milliseconds before the highlight is cleared.
 * @returns An object containing `highlightedId` (the current highlighted id or `null`) and `registerElement` (a function to register or unregister elements by id)
 */
export function useHighlightScroll(
  highlightId: string | null,
  onClearHighlight: () => void,
  highlightDuration = 1000
) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());

  const registerElement = (id: string, element: HTMLElement | null) => {
    if (element) {
      elementRefs.current.set(id, element);
    } else {
      elementRefs.current.delete(id);
    }
  };

  useEffect(() => {
    if (!highlightId) return;

    setHighlightedId(highlightId);

    const target = elementRefs.current.get(highlightId);
    target?.scrollIntoView({ block: "center" });

    const timeout = setTimeout(() => {
      setHighlightedId(null);
      onClearHighlight();
    }, highlightDuration);

    return () => clearTimeout(timeout);
  }, [highlightId, onClearHighlight, highlightDuration]);

  return { highlightedId, registerElement };
}