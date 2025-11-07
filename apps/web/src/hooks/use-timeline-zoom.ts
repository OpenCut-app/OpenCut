import { useState, useCallback, useEffect, RefObject } from "react";

interface UseTimelineZoomProps {
  containerRef: RefObject<HTMLDivElement>;
  isInTimeline?: boolean;
}

interface UseTimelineZoomReturn {
  zoomLevel: number;
  setZoomLevel: (zoomLevel: number | ((prev: number) => number)) => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export function useTimelineZoom({
  containerRef,
  isInTimeline = false,
}: UseTimelineZoomProps): UseTimelineZoomReturn {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Only zoom if user is using pinch gesture (ctrlKey or metaKey is true)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoomLevel((prev) => Math.max(0.1, Math.min(10, prev + delta)));
    }
    // For horizontal scrolling (when shift is held or horizontal wheel movement),
    // let the event bubble up to allow ScrollArea to handle it
    else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Don't prevent default - let ScrollArea handle horizontal scrolling
      return;
    }
    // Otherwise, allow normal scrolling
  }, []);

  // Prevent browser zooming in/out when in timeline
  useEffect(() => {
    const preventZoom = (e: WheelEvent) => {
      if (
        isInTimeline &&
        (e.ctrlKey || e.metaKey) &&
        containerRef.current?.contains(e.target as Node)
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("wheel", preventZoom, { passive: false });

    return () => {
      document.removeEventListener("wheel", preventZoom);
    };
  }, [isInTimeline, containerRef]);

  return {
    zoomLevel,
    setZoomLevel,
    handleWheel,
  };
}
