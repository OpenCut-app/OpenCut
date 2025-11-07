import { useEffect, useRef } from "react";

interface UseEdgeAutoScrollParams {
  isActive: boolean;
  getMouseClientX: () => number;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  contentWidth: number;
  edgeThreshold?: number;
  maxScrollSpeed?: number;
}

// Provides smooth edge auto-scrolling for horizontal timeline interactions.
export function useEdgeAutoScroll({
  isActive,
  getMouseClientX,
  rulerScrollRef,
  tracksScrollRef,
  contentWidth,
  edgeThreshold = 100,
  maxScrollSpeed = 15,
}: UseEdgeAutoScrollParams): void {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const step = () => {
      const rulerViewport = rulerScrollRef.current;
      const tracksViewport = tracksScrollRef.current;
      if (!rulerViewport || !tracksViewport) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const viewportRect = rulerViewport.getBoundingClientRect();
      const mouseX = getMouseClientX();
      const mouseXRelative = mouseX - viewportRect.left;

      const viewportWidth = rulerViewport.clientWidth;
      const intrinsicContentWidth = rulerViewport.scrollWidth;
      const effectiveContentWidth = Math.max(
        contentWidth,
        intrinsicContentWidth
      );
      const scrollMax = Math.max(0, effectiveContentWidth - viewportWidth);

      let scrollSpeed = 0;

      if (mouseXRelative < edgeThreshold && rulerViewport.scrollLeft > 0) {
        const edgeDistance = Math.max(0, mouseXRelative);
        const intensity = 1 - edgeDistance / edgeThreshold;
        scrollSpeed = -maxScrollSpeed * intensity;
      } else if (
        mouseXRelative > viewportWidth - edgeThreshold &&
        rulerViewport.scrollLeft < scrollMax
      ) {
        const edgeDistance = Math.max(
          0,
          viewportWidth - edgeThreshold - mouseXRelative
        );
        const intensity = 1 - edgeDistance / edgeThreshold;
        scrollSpeed = maxScrollSpeed * intensity;
      }

      if (scrollSpeed !== 0) {
        const newScrollLeft = Math.max(
          0,
          Math.min(scrollMax, rulerViewport.scrollLeft + scrollSpeed)
        );
        rulerViewport.scrollLeft = newScrollLeft;
        tracksViewport.scrollLeft = newScrollLeft;
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    isActive,
    getMouseClientX,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth,
    edgeThreshold,
    maxScrollSpeed,
  ]);
}
