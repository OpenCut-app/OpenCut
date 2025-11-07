import { useState, useEffect } from "react";
import { ResizeState, TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { DEFAULT_FPS, useProjectStore } from "@/stores/project-store";
import { snapTimeToFrame } from "@/constants/timeline-constants";

interface UseTimelineElementResizeProps {
  element: TimelineElement;
  track: TimelineTrack;
  zoomLevel: number;
}

export function useTimelineElementResize({
  element,
  track,
  zoomLevel,
}: UseTimelineElementResizeProps) {
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const { mediaFiles } = useMediaStore();
  const {
    updateElementStartTime,
    updateElementTrim,
    updateElementDuration,
    pushHistory,
  } = useTimelineStore();

  // Set up document-level mouse listeners during resize (like proper drag behavior)
  useEffect(() => {
    if (!resizing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      updateTrimFromMouseMove({ clientX: e.clientX });
    };

    const handleDocumentMouseUp = () => {
      handleResizeEnd();
    };

    // Add document-level listeners for proper drag behavior
    document.addEventListener("mousemove", handleDocumentMouseMove);
    document.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleDocumentMouseMove);
      document.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, [resizing]); // Re-run when resizing state changes

  const handleResizeStart = (
    e: React.MouseEvent,
    elementId: string,
    side: "left" | "right"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // Push history once at the start of the resize operation
    pushHistory();

    setResizing({
      elementId,
      side,
      startX: e.clientX,
      initialTrimStart: element.trimStart,
      initialTrimEnd: element.trimEnd,
    });
  };

  const canExtendElementDuration = () => {
    // Text elements can always be extended
    if (element.type === "text") {
      return true;
    }

    // Media elements - check the media type
    if (element.type === "media") {
      const mediaFile = mediaFiles.find((file) => file.id === element.mediaId);
      if (!mediaFile) return false;

      // Images can be extended (static content)
      if (mediaFile.type === "image") {
        return true;
      }

      // Videos and audio cannot be extended beyond their natural duration
      // (no additional content exists)
      return false;
    }

    return false;
  };

  const updateTrimFromMouseMove = (e: { clientX: number }) => {
    if (!resizing) return;

    const deltaX = e.clientX - resizing.startX;
    // Reasonable sensitivity for resize operations - similar to timeline scale
    const deltaTime = deltaX / (50 * zoomLevel);

    // Get project FPS for frame snapping
    const projectStore = useProjectStore.getState();
    const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;

    if (resizing.side === "left") {
      // Left resize - different behavior for media vs text/image elements
      const maxAllowed = element.duration - resizing.initialTrimEnd - 0.1;
      const calculated = resizing.initialTrimStart + deltaTime;

      if (calculated >= 0) {
        // Normal trimming within available content
        const newTrimStart = snapTimeToFrame(
          Math.min(maxAllowed, calculated),
          projectFps
        );
        const trimDelta = newTrimStart - resizing.initialTrimStart;
        const newStartTime = snapTimeToFrame(
          element.startTime + trimDelta,
          projectFps
        );

        updateElementTrim(
          track.id,
          element.id,
          newTrimStart,
          resizing.initialTrimEnd,
          false
        );
        updateElementStartTime(track.id, element.id, newStartTime, false);
      } else {
        // Trying to extend beyond trimStart = 0
        if (canExtendElementDuration()) {
          // Text/Image: extend element to the left by moving startTime and increasing duration
          const extensionAmount = Math.abs(calculated);
          const maxExtension = element.startTime;
          const actualExtension = Math.min(extensionAmount, maxExtension);
          const newStartTime = snapTimeToFrame(
            element.startTime - actualExtension,
            projectFps
          );
          const newDuration = snapTimeToFrame(
            element.duration + actualExtension,
            projectFps
          );

          // Keep trimStart at 0 and extend the element
          updateElementTrim(
            track.id,
            element.id,
            0,
            resizing.initialTrimEnd,
            false
          );
          updateElementDuration(track.id, element.id, newDuration, false);
          updateElementStartTime(track.id, element.id, newStartTime, false);
        } else {
          // Video/Audio: can't extend beyond original content - limit to trimStart = 0
          const newTrimStart = 0;
          const trimDelta = newTrimStart - resizing.initialTrimStart;
          const newStartTime = snapTimeToFrame(
            element.startTime + trimDelta,
            projectFps
          );

          updateElementTrim(
            track.id,
            element.id,
            newTrimStart,
            resizing.initialTrimEnd,
            false
          );
          updateElementStartTime(track.id, element.id, newStartTime, false);
        }
      }
    } else {
      // Right resize - can extend duration for supported element types
      const calculated = resizing.initialTrimEnd - deltaTime;

      if (calculated < 0) {
        // We're trying to extend beyond original duration
        if (canExtendElementDuration()) {
          // Extend the duration instead of reducing trimEnd further
          const extensionNeeded = Math.abs(calculated);
          const newDuration = snapTimeToFrame(
            element.duration + extensionNeeded,
            projectFps
          );
          const newTrimEnd = 0; // Reset trimEnd to 0 since we're extending

          // Update duration first, then trim
          updateElementDuration(track.id, element.id, newDuration, false);
          updateElementTrim(
            track.id,
            element.id,
            resizing.initialTrimStart,
            newTrimEnd,
            false
          );
        } else {
          // Can't extend - just set trimEnd to 0 (maximum possible extension)
          updateElementTrim(
            track.id,
            element.id,
            resizing.initialTrimStart,
            0,
            false
          );
        }
      } else {
        // Normal trimming within original duration
        // Calculate the desired end time based on mouse movement
        const currentEndTime =
          element.startTime +
          element.duration -
          element.trimStart -
          element.trimEnd;
        const desiredEndTime = currentEndTime + deltaTime;

        // Snap the desired end time to frame
        const snappedEndTime = snapTimeToFrame(desiredEndTime, projectFps);

        // Calculate what trimEnd should be to achieve this snapped end time
        const newTrimEnd = Math.max(
          0,
          element.duration -
            element.trimStart -
            (snappedEndTime - element.startTime)
        );

        // Ensure we don't trim more than available content (leave at least 0.1s visible)
        const maxTrimEnd = element.duration - element.trimStart - 0.1;
        const finalTrimEnd = Math.min(maxTrimEnd, newTrimEnd);

        updateElementTrim(
          track.id,
          element.id,
          element.trimStart,
          finalTrimEnd,
          false
        );
      }
    }
  };

  const handleResizeEnd = () => {
    setResizing(null);
  };

  return {
    resizing,
    isResizing: resizing !== null,
    handleResizeStart,
    // Return empty handlers since we use document listeners now
    handleResizeMove: () => {}, // Not used anymore
    handleResizeEnd: () => {}, // Not used anymore
  };
}
