import { snapTimeToFrame } from "@/constants/timeline-constants";
import { DEFAULT_FPS, useProjectStore } from "@/stores/project-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useState, useEffect, useCallback, useRef } from "react";
import { useEdgeAutoScroll } from "@/hooks/use-edge-auto-scroll";

interface UseTimelinePlayheadProps {
  currentTime: number;
  duration: number;
  zoomLevel: number;
  seek: (time: number) => void;
  rulerRef: React.RefObject<HTMLDivElement>;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
  playheadRef?: React.RefObject<HTMLDivElement>;
}

export function useTimelinePlayhead({
  currentTime,
  duration,
  zoomLevel,
  seek,
  rulerRef,
  rulerScrollRef,
  tracksScrollRef,
  playheadRef,
}: UseTimelinePlayheadProps) {
  // Playhead scrubbing state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  // Ruler drag detection state
  const [isDraggingRuler, setIsDraggingRuler] = useState(false);
  const [hasDraggedRuler, setHasDraggedRuler] = useState(false);
  const lastMouseXRef = useRef<number>(0);

  const playheadPosition =
    isScrubbing && scrubTime !== null ? scrubTime : currentTime;

  // --- Playhead Scrubbing Handlers ---
  const handlePlayheadMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent ruler drag from triggering
      setIsScrubbing(true);
      handleScrub(e);
    },
    [duration, zoomLevel]
  );

  // Ruler mouse down handler
  const handleRulerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      // Don't interfere if clicking on the playhead itself
      if (playheadRef?.current?.contains(e.target as Node)) return;

      e.preventDefault();
      setIsDraggingRuler(true);
      setHasDraggedRuler(false);

      // Start scrubbing immediately
      setIsScrubbing(true);
      handleScrub(e);
    },
    [duration, zoomLevel]
  );

  const handleScrub = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      const ruler = rulerRef.current;
      if (!ruler) return;
      const rect = ruler.getBoundingClientRect();
      const rawX = e.clientX - rect.left;

      // Get the timeline content width based on duration and zoom
      const timelineContentWidth = duration * 50 * zoomLevel; // TIMELINE_CONSTANTS.PIXELS_PER_SECOND = 50

      // Constrain x to be within the timeline content bounds
      const x = Math.max(0, Math.min(timelineContentWidth, rawX));

      const rawTime = Math.max(0, Math.min(duration, x / (50 * zoomLevel)));
      // Use frame snapping for playhead scrubbing
      const projectStore = useProjectStore.getState();
      const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;
      const time = snapTimeToFrame(rawTime, projectFps);

      // Debug logging
      if (rawX < 0 || x !== rawX) {
        console.log(
          "PLAYHEAD DEBUG:",
          JSON.stringify({
            mouseX: e.clientX,
            rulerLeft: rect.left,
            rawX,
            constrainedX: x,
            timelineContentWidth,
            rawTime,
            finalTime: time,
            duration,
            zoomLevel,
            playheadPx: time * 50 * zoomLevel,
          })
        );
      }

      setScrubTime(time);
      seek(time); // update video preview in real time

      // Store mouse position for auto-scrolling
      lastMouseXRef.current = e.clientX;
    },
    [duration, zoomLevel, seek, rulerRef]
  );

  useEdgeAutoScroll({
    isActive: isScrubbing,
    getMouseClientX: () => lastMouseXRef.current,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: duration * 50 * zoomLevel,
  });

  // Mouse move/up event handlers
  useEffect(() => {
    if (!isScrubbing) return;

    const onMouseMove = (e: MouseEvent) => {
      handleScrub(e);
      // Mark that we've dragged if ruler drag is active
      if (isDraggingRuler) {
        setHasDraggedRuler(true);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      setIsScrubbing(false);
      if (scrubTime !== null) seek(scrubTime); // finalize seek
      setScrubTime(null);

      // Handle ruler click vs drag
      if (isDraggingRuler) {
        setIsDraggingRuler(false);
        // If we didn't drag, treat it as a click-to-seek
        if (!hasDraggedRuler) {
          handleScrub(e);
        }
        setHasDraggedRuler(false);
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Edge auto-scroll is handled by useEdgeAutoScroll

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      // nothing to cleanup for edge auto scroll
    };
  }, [
    isScrubbing,
    scrubTime,
    seek,
    handleScrub,
    isDraggingRuler,
    hasDraggedRuler,
    // edge auto scroll hook is independent
  ]);

  // --- Playhead auto-scroll effect (only during playback) ---
  useEffect(() => {
    const { isPlaying } = usePlaybackStore.getState();

    // Only auto-scroll during playback, not during manual interactions
    if (!isPlaying || isScrubbing) return;

    const rulerViewport = rulerScrollRef.current;
    const tracksViewport = tracksScrollRef.current;
    if (!rulerViewport || !tracksViewport) return;

    const playheadPx = playheadPosition * 50 * zoomLevel; // TIMELINE_CONSTANTS.PIXELS_PER_SECOND = 50
    const viewportWidth = rulerViewport.clientWidth;
    const scrollMin = 0;
    const scrollMax = rulerViewport.scrollWidth - viewportWidth;

    // Only auto-scroll if playhead is completely out of view (no buffer)
    const needsScroll =
      playheadPx < rulerViewport.scrollLeft ||
      playheadPx > rulerViewport.scrollLeft + viewportWidth;

    if (needsScroll) {
      // Center the playhead in the viewport
      const desiredScroll = Math.max(
        scrollMin,
        Math.min(scrollMax, playheadPx - viewportWidth / 2)
      );
      rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
    }
  }, [
    playheadPosition,
    duration,
    zoomLevel,
    rulerScrollRef,
    tracksScrollRef,
    isScrubbing,
  ]);

  return {
    playheadPosition,
    handlePlayheadMouseDown,
    handleRulerMouseDown,
    isDraggingRuler,
  };
}
