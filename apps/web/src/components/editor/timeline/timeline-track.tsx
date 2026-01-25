"use client";

import { useRef, useState, useEffect } from "react";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { toast } from "sonner";
import { processMediaFiles } from "@/lib/media-processing";
import { TimelineElement } from "./timeline-element";
import {
  TimelineTrack,
  getMainTrack,
  canElementGoOnTrack,
} from "@/types/timeline";
import { usePlaybackStore } from "@/stores/playback-store";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import type {
  TimelineElement as TimelineElementType,
  DragData,
  TrackType,
} from "@/types/timeline";
import {
  snapTimeToFrame,
  TIMELINE_CONSTANTS,
} from "@/constants/timeline-constants";
import { DEFAULT_FPS, useProjectStore } from "@/stores/project-store";
import { useTimelineSnapping, SnapPoint } from "@/hooks/use-timeline-snapping";
import { useEdgeAutoScroll } from "@/hooks/use-edge-auto-scroll";

export function TimelineTrackContent({
  track,
  zoomLevel,
  onSnapPointChange,
  rulerScrollRef,
  tracksScrollRef,
}: {
  track: TimelineTrack;
  zoomLevel: number;
  onSnapPointChange?: (snapPoint: SnapPoint | null) => void;
  rulerScrollRef: React.RefObject<HTMLDivElement>;
  tracksScrollRef: React.RefObject<HTMLDivElement>;
}) {
  const { mediaFiles } = useMediaStore();
  const {
    tracks,
    addTrack,
    moveElementToTrack,
    updateElementStartTime,
    updateElementStartTimeWithRipple,
    addElementToTrack,
    selectedElements,
    selectElement,
    dragState,
    startDrag: startDragAction,
    updateDragTime,
    endDrag: endDragAction,
    clearSelectedElements,
    insertTrackAt,
    snappingEnabled,
    rippleEditingEnabled,
  } = useTimelineStore();

  const { currentTime, duration } = usePlaybackStore();

  // Initialize snapping hook
  const { snapElementPosition, snapElementEdge } = useTimelineSnapping({
    snapThreshold: 10,
    enableElementSnapping: snappingEnabled,
    enablePlayheadSnapping: snappingEnabled,
  });

  const getEffectiveDuration = (element: TimelineElementType) =>
    Math.max(0, element.duration - element.trimStart - element.trimEnd);

  const resolveOverlapsInOrder = (elements: TimelineElementType[]) => {
    const resolvedElements: TimelineElementType[] = [];

    for (const element of elements) {
      const previous = resolvedElements.at(-1);
      if (!previous) {
        resolvedElements.push(element);
        continue;
      }

      const previousEnd = previous.startTime + getEffectiveDuration(previous);
      if (element.startTime >= previousEnd) {
        resolvedElements.push(element);
        continue;
      }

      resolvedElements.push({ ...element, startTime: previousEnd });
    }

    return resolvedElements;
  };

  const insertElementAtTime = (
    elements: TimelineElementType[],
    elementId: string,
    startTime: number
  ) => {
    const movingElement = elements.find((element) => element.id === elementId);
    if (!movingElement) return elements;

    const clampedStartTime = Math.max(0, startTime);
    const otherElements = elements.filter(
      (element) => element.id !== elementId
    );
    const sortedElements = [...otherElements].sort(
      (a, b) => a.startTime - b.startTime
    );

    const insertIndex = sortedElements.findIndex((element) => {
      const elementEnd = element.startTime + getEffectiveDuration(element);
      return clampedStartTime < elementEnd;
    });

    const targetIndex =
      insertIndex === -1 ? sortedElements.length : Math.max(0, insertIndex);

    const orderedElements: TimelineElementType[] = [
      ...sortedElements.slice(0, targetIndex),
      { ...movingElement, startTime: clampedStartTime },
      ...sortedElements.slice(targetIndex),
    ];

    return resolveOverlapsInOrder(orderedElements);
  };

  // Helper function for drop snapping that tries both edges
  const getDropSnappedTime = (
    dropTime: number,
    elementDuration: number,
    excludeElementId?: string
  ) => {
    // Always apply frame snapping first
    const projectStore = useProjectStore.getState();
    const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;
    let finalTime = snapTimeToFrame(dropTime, projectFps);

    // Additionally apply element snapping if enabled
    if (snappingEnabled) {
      // Try snapping both start and end edges for drops
      const startSnapResult = snapElementEdge(
        dropTime,
        elementDuration,
        tracks,
        currentTime,
        zoomLevel,
        excludeElementId,
        true // snap to start edge
      );

      const endSnapResult = snapElementEdge(
        dropTime,
        elementDuration,
        tracks,
        currentTime,
        zoomLevel,
        excludeElementId,
        false // snap to end edge
      );

      // Choose the snap result with the smaller distance (closer snap)
      let bestSnapResult = startSnapResult;
      if (
        endSnapResult.snapPoint &&
        (!startSnapResult.snapPoint ||
          endSnapResult.snapDistance < startSnapResult.snapDistance)
      ) {
        bestSnapResult = endSnapResult;
      }

      // Only use element snapping if it found a snap point, otherwise keep frame-snapped time
      if (bestSnapResult.snapPoint) {
        finalTime = bestSnapResult.snappedTime;
      }
    }

    return finalTime;
  };

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDropping, setIsDropping] = useState(false);
  const [dropPosition, setDropPosition] = useState<number | null>(null);
  const [wouldOverlap, setWouldOverlap] = useState(false);
  const dragCounterRef = useRef(0);
  const [mouseDownLocation, setMouseDownLocation] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const lastMouseXRef = useRef(0);

  // Set up mouse event listeners for drag
  useEffect(() => {
    if (!dragState.isDragging || dragState.trackId !== track.id) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      lastMouseXRef.current = e.clientX;

      const {
        dragState: currentDragState,
        selectedElements: currentSelectedElements,
        selectElement: selectElementAction,
        tracks: currentTracks,
        snappingEnabled: currentSnappingEnabled,
        updateDragTime: updateDragTimeAction,
      } = useTimelineStore.getState();

      if (
        !currentDragState.isDragging ||
        !currentDragState.elementId ||
        !currentDragState.trackId
      ) {
        return;
      }

      // On first mouse move during drag, ensure the element is selected
      {
        const isSelected = currentSelectedElements.some(
          (c) =>
            c.trackId === currentDragState.trackId &&
            c.elementId === currentDragState.elementId
        );

        if (!isSelected) {
          // Select this element (replacing other selections) since we're dragging it
          selectElementAction(
            currentDragState.trackId,
            currentDragState.elementId,
            false
          );
        }
      }

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const mouseX = e.clientX - timelineRect.left;
      const mouseTime = Math.max(
        0,
        mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel)
      );
      const adjustedTime = Math.max(
        0,
        mouseTime - currentDragState.clickOffsetTime
      );

      // Always apply frame snapping first
      const projectStore = useProjectStore.getState();
      const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;
      let finalTime = snapTimeToFrame(adjustedTime, projectFps);
      let snapPoint = null;

      // Additionally apply element snapping if enabled
      if (currentSnappingEnabled) {
        // Find the element being dragged to get its duration
        let elementDuration = 5; // fallback duration
        {
          const sourceTrack = currentTracks.find(
            (t) => t.id === currentDragState.trackId
          );
          const element = sourceTrack?.elements.find(
            (e) => e.id === currentDragState.elementId
          );
          if (element) {
            elementDuration = getEffectiveDuration(element);
          }
        }

        const playbackStore = usePlaybackStore.getState();
        const playheadTime = playbackStore.currentTime;

        // Try snapping both start and end edges
        const startSnapResult = snapElementEdge(
          adjustedTime,
          elementDuration,
          currentTracks,
          playheadTime,
          zoomLevel,
          currentDragState.elementId,
          true // snap to start edge
        );

        const endSnapResult = snapElementEdge(
          adjustedTime,
          elementDuration,
          currentTracks,
          playheadTime,
          zoomLevel,
          currentDragState.elementId,
          false // snap to end edge
        );

        // Choose the snap result with the smaller distance (closer snap)
        let bestSnapResult = startSnapResult;
        if (
          endSnapResult.snapPoint &&
          (!startSnapResult.snapPoint ||
            endSnapResult.snapDistance < startSnapResult.snapDistance)
        ) {
          bestSnapResult = endSnapResult;
        }

        // Only use element snapping if it found a snap point, otherwise keep frame-snapped time
        if (bestSnapResult.snapPoint) {
          finalTime = bestSnapResult.snappedTime;
          snapPoint = bestSnapResult.snapPoint;
        }

        // Notify parent component about snap point change
        onSnapPointChange?.(snapPoint);
      } else {
        // Clear snap point when element snapping is disabled
        onSnapPointChange?.(null);
      }

      updateDragTimeAction(finalTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      const {
        dragState: currentDragState,
        tracks: currentTracks,
        moveElementToTrack: moveElementToTrackAction,
        replaceTrackElements,
        endDrag,
      } = useTimelineStore.getState();

      if (
        !currentDragState.isDragging ||
        !currentDragState.elementId ||
        !currentDragState.trackId
      ) {
        return;
      }

      const getTrackIdAtPoint = (clientX: number, clientY: number) => {
        const elementsAtPoint =
          typeof document.elementsFromPoint === "function"
            ? document.elementsFromPoint(clientX, clientY)
            : (() => {
                const element = document.elementFromPoint(clientX, clientY);
                return element ? [element] : [];
              })();

        for (const element of elementsAtPoint) {
          if (!(element instanceof HTMLElement)) continue;
          const container = element.closest<HTMLElement>(
            ".track-elements-container"
          );
          const foundTrackId = container?.dataset.trackId;
          if (foundTrackId) return foundTrackId;
        }

        return null;
      };

      const targetTrackId =
        getTrackIdAtPoint(e.clientX, e.clientY) ?? currentDragState.trackId;

      const finalTime = currentDragState.currentTime;

      if (targetTrackId === currentDragState.trackId) {
        const sourceTrack = currentTracks.find(
          (t) => t.id === currentDragState.trackId
        );
        if (sourceTrack) {
          const updatedElements = insertElementAtTime(
            sourceTrack.elements,
            currentDragState.elementId,
            finalTime
          );
          replaceTrackElements(sourceTrack.id, updatedElements);
        }
      } else {
        moveElementToTrackAction(
          currentDragState.trackId,
          targetTrackId,
          currentDragState.elementId
        );

        const nextTracks = useTimelineStore.getState().tracks;
        const targetTrack = nextTracks.find((t) => t.id === targetTrackId);
        if (targetTrack) {
          const updatedElements = insertElementAtTime(
            targetTrack.elements,
            currentDragState.elementId,
            finalTime
          );
          replaceTrackElements(targetTrackId, updatedElements, false);
        }
      }

      endDrag();
      onSnapPointChange?.(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState.isDragging,
    dragState.clickOffsetTime,
    dragState.elementId,
    dragState.trackId,
    zoomLevel,
    track.id,
    onSnapPointChange,
    snapElementEdge,
  ]);

  useEdgeAutoScroll({
    isActive: dragState.isDragging,
    getMouseClientX: () => lastMouseXRef.current,
    rulerScrollRef,
    tracksScrollRef,
    contentWidth: duration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel,
  });

  const handleElementMouseDown = (
    e: React.MouseEvent,
    element: TimelineElementType
  ) => {
    setMouseDownLocation({ x: e.clientX, y: e.clientY });

    // Detect right-click (button 2) and handle selection without starting drag
    const isRightClick = e.button === 2;
    const isMultiSelect = e.metaKey || e.ctrlKey || e.shiftKey;

    if (isRightClick) {
      // Handle right-click selection
      const isSelected = selectedElements.some(
        (c) => c.trackId === track.id && c.elementId === element.id
      );

      // If element is not selected, select it (keep other selections if multi-select)
      if (!isSelected) {
        selectElement(track.id, element.id, isMultiSelect);
      }
      // If element is already selected, keep it selected

      // Don't start drag action for right-clicks
      return;
    }

    // Handle multi-selection for left-click with modifiers
    if (isMultiSelect) {
      selectElement(track.id, element.id, true);
    }

    // Calculate the offset from the left edge of the element to where the user clicked
    const elementElement = e.currentTarget as HTMLElement;
    const elementRect = elementElement.getBoundingClientRect();
    const clickOffsetX = e.clientX - elementRect.left;
    const clickOffsetTime =
      clickOffsetX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);

    startDragAction(
      element.id,
      track.id,
      e.clientX,
      element.startTime,
      clickOffsetTime
    );
  };

  const handleElementClick = (
    e: React.MouseEvent,
    element: TimelineElementType
  ) => {
    e.stopPropagation();

    // Check if mouse moved significantly
    if (mouseDownLocation) {
      const deltaX = Math.abs(e.clientX - mouseDownLocation.x);
      const deltaY = Math.abs(e.clientY - mouseDownLocation.y);
      // If it moved more than a few pixels, consider it a drag and not a click.
      if (deltaX > 5 || deltaY > 5) {
        setMouseDownLocation(null); // Reset for next interaction
        return;
      }
    }

    // Skip selection logic for multi-selection (handled in mousedown)
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      return;
    }

    // Handle single selection
    const isSelected = selectedElements.some(
      (c) => c.trackId === track.id && c.elementId === element.id
    );

    if (!isSelected) {
      // If element is not selected, select it (replacing other selections)
      selectElement(track.id, element.id, false);
    }
    // If element is already selected, keep it selected (do nothing)
  };

  const handleTrackDragOver = (e: React.DragEvent) => {
    e.preventDefault();

    // Handle both timeline elements and media items
    const hasTimelineElement = e.dataTransfer.types.includes(
      "application/x-timeline-element"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineElement && !hasMediaItem) return;

    // Calculate drop position for overlap checking
    const trackContainer = e.currentTarget.querySelector(
      ".track-elements-container"
    ) as HTMLElement;
    let dropTime = 0;
    if (trackContainer) {
      const rect = trackContainer.getBoundingClientRect();
      const mouseX = Math.max(0, e.clientX - rect.left);
      dropTime = mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
    }

    // Check for potential overlaps and show appropriate feedback
    let wouldOverlap = false;

    if (hasMediaItem) {
      try {
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (mediaItemData) {
          const dragData: DragData = JSON.parse(mediaItemData);

          if (dragData.type === "text") {
            // Text elements have default duration of 5 seconds
            const newElementDuration = 5;
            const snappedTime = getDropSnappedTime(
              dropTime,
              newElementDuration
            );
            const newElementEnd = snappedTime + newElementDuration;

            wouldOverlap = track.elements.some((existingElement) => {
              const existingStart = existingElement.startTime;
              const existingEnd =
                existingElement.startTime +
                (existingElement.duration -
                  existingElement.trimStart -
                  existingElement.trimEnd);
              return snappedTime < existingEnd && newElementEnd > existingStart;
            });
          } else {
            // Media elements
            const mediaItem = mediaFiles.find(
              (item) => item.id === dragData.id
            );
            if (mediaItem) {
              const newElementDuration = mediaItem.duration || 5;
              const snappedTime = getDropSnappedTime(
                dropTime,
                newElementDuration
              );
              const newElementEnd = snappedTime + newElementDuration;

              wouldOverlap = track.elements.some((existingElement) => {
                const existingStart = existingElement.startTime;
                const existingEnd =
                  existingElement.startTime +
                  (existingElement.duration -
                    existingElement.trimStart -
                    existingElement.trimEnd);
                return (
                  snappedTime < existingEnd && newElementEnd > existingStart
                );
              });
            }
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    } else if (hasTimelineElement) {
      try {
        const timelineElementData = e.dataTransfer.getData(
          "application/x-timeline-element"
        );
        if (timelineElementData) {
          const { elementId, trackId: fromTrackId } =
            JSON.parse(timelineElementData);
          const sourceTrack = tracks.find(
            (t: TimelineTrack) => t.id === fromTrackId
          );
          const movingElement = sourceTrack?.elements.find(
            (c: any) => c.id === elementId
          );

          if (movingElement) {
            const movingElementDuration =
              movingElement.duration -
              movingElement.trimStart -
              movingElement.trimEnd;
            const snappedTime = getDropSnappedTime(
              dropTime,
              movingElementDuration,
              elementId
            );
            const movingElementEnd = snappedTime + movingElementDuration;

            wouldOverlap = track.elements.some((existingElement) => {
              if (fromTrackId === track.id && existingElement.id === elementId)
                return false;

              const existingStart = existingElement.startTime;
              const existingEnd =
                existingElement.startTime +
                (existingElement.duration -
                  existingElement.trimStart -
                  existingElement.trimEnd);
              return (
                snappedTime < existingEnd && movingElementEnd > existingStart
              );
            });
          }
        }
      } catch (error) {
        // Continue with default behavior
      }
    }

    if (wouldOverlap) {
      e.dataTransfer.dropEffect = "none";
      setWouldOverlap(true);
      // Use default duration for position indicator
      setDropPosition(getDropSnappedTime(dropTime, 5));
      return;
    }

    e.dataTransfer.dropEffect = hasTimelineElement ? "move" : "copy";
    setWouldOverlap(false);
    // Use default duration for position indicator
    setDropPosition(getDropSnappedTime(dropTime, 5));
  };

  const handleTrackDragEnter = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineElement = e.dataTransfer.types.includes(
      "application/x-timeline-element"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineElement && !hasMediaItem) return;

    dragCounterRef.current++;
    setIsDropping(true);
  };

  const handleTrackDragLeave = (e: React.DragEvent) => {
    e.preventDefault();

    const hasTimelineElement = e.dataTransfer.types.includes(
      "application/x-timeline-element"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );

    if (!hasTimelineElement && !hasMediaItem) return;

    dragCounterRef.current--;

    if (dragCounterRef.current === 0) {
      setIsDropping(false);
      setWouldOverlap(false);
      setDropPosition(null);
    }
  };

  const handleTrackDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Debug logging
    console.log(
      JSON.stringify({
        message: "Drop event started in timeline track",
        dataTransferTypes: Array.from(e.dataTransfer.types),
        trackId: track.id,
        trackType: track.type,
      })
    );

    // Reset all drag states
    dragCounterRef.current = 0;
    setIsDropping(false);
    setWouldOverlap(false);

    const hasTimelineElement = e.dataTransfer.types.includes(
      "application/x-timeline-element"
    );
    const hasMediaItem = e.dataTransfer.types.includes(
      "application/x-media-item"
    );
    const hasFiles = e.dataTransfer.files?.length > 0;

    if (!hasTimelineElement && !hasMediaItem && !hasFiles) return;

    const trackContainer = e.currentTarget.querySelector(
      ".track-elements-container"
    ) as HTMLElement;
    if (!trackContainer) return;

    const rect = trackContainer.getBoundingClientRect();
    const mouseX = Math.max(0, e.clientX - rect.left);
    const mouseY = e.clientY - rect.top; // Get Y position relative to this track
    const newStartTime =
      mouseX / (TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel);
    const projectStore = useProjectStore.getState();
    const projectFps = projectStore.activeProject?.fps || DEFAULT_FPS;
    const snappedTime = snapTimeToFrame(newStartTime, projectFps);

    // Calculate drop position relative to tracks
    const currentTrackIndex = tracks.findIndex((t) => t.id === track.id);

    // Determine drop zone within the track (top 20px, middle 20px, bottom 20px)
    let dropPosition: "above" | "on" | "below";
    if (mouseY < 20) {
      dropPosition = "above";
    } else if (mouseY > 40) {
      dropPosition = "below";
    } else {
      dropPosition = "on";
    }

    try {
      if (hasTimelineElement) {
        // Handle timeline element movement
        const timelineElementData = e.dataTransfer.getData(
          "application/x-timeline-element"
        );
        if (!timelineElementData) return;

        const {
          elementId,
          trackId: fromTrackId,
          clickOffsetTime = 0,
        } = JSON.parse(timelineElementData);

        // Find the element being moved
        const sourceTrack = tracks.find(
          (t: TimelineTrack) => t.id === fromTrackId
        );
        const movingElement = sourceTrack?.elements.find(
          (c: TimelineElementType) => c.id === elementId
        );

        if (!movingElement) {
          toast.error("Element not found");
          return;
        }

        // Check for overlaps with existing elements (excluding the moving element itself)
        const movingElementDuration =
          movingElement.duration -
          movingElement.trimStart -
          movingElement.trimEnd;

        // Adjust position based on where user clicked on the element
        const adjustedStartTime = newStartTime - clickOffsetTime;
        const snappedStartTime = getDropSnappedTime(
          adjustedStartTime,
          movingElementDuration,
          elementId
        );
        const finalStartTime = Math.max(0, snappedStartTime);
        const movingElementEnd = finalStartTime + movingElementDuration;

        const hasOverlap = track.elements.some((existingElement) => {
          // Skip the element being moved if it's on the same track
          if (fromTrackId === track.id && existingElement.id === elementId)
            return false;

          const existingStart = existingElement.startTime;
          const existingEnd =
            existingElement.startTime +
            (existingElement.duration -
              existingElement.trimStart -
              existingElement.trimEnd);

          // Check if elements overlap
          return (
            finalStartTime < existingEnd && movingElementEnd > existingStart
          );
        });

        if (hasOverlap) {
          toast.error(
            "Cannot move element here - it would overlap with existing elements"
          );
          return;
        }

        if (fromTrackId === track.id) {
          // Moving within same track
          if (rippleEditingEnabled) {
            updateElementStartTimeWithRipple(
              track.id,
              elementId,
              finalStartTime
            );
          } else {
            updateElementStartTime(track.id, elementId, finalStartTime);
          }
        } else {
          // Moving to different track
          moveElementToTrack(fromTrackId, track.id, elementId);
          requestAnimationFrame(() => {
            if (rippleEditingEnabled) {
              updateElementStartTimeWithRipple(
                track.id,
                elementId,
                finalStartTime
              );
            } else {
              updateElementStartTime(track.id, elementId, finalStartTime);
            }
          });
        }
      } else if (hasMediaItem) {
        // Handle media item drop
        const mediaItemData = e.dataTransfer.getData(
          "application/x-media-item"
        );
        if (!mediaItemData) return;

        const dragData: DragData = JSON.parse(mediaItemData);

        if (dragData.type === "text") {
          let targetTrackId = track.id;
          let targetTrack = track;

          // Handle position-aware track creation for text
          if (track.type !== "text" || dropPosition !== "on") {
            // Text tracks should go above the main track
            const mainTrack = getMainTrack(tracks);
            let insertIndex: number;

            if (dropPosition === "above") {
              insertIndex = currentTrackIndex;
            } else if (dropPosition === "below") {
              insertIndex = currentTrackIndex + 1;
            } else {
              // dropPosition === "on" but track is not text type
              // Insert above main track if main track exists, otherwise at top
              if (mainTrack) {
                const mainTrackIndex = tracks.findIndex(
                  (t) => t.id === mainTrack.id
                );
                insertIndex = mainTrackIndex;
              } else {
                insertIndex = 0; // Top of timeline
              }
            }

            targetTrackId = insertTrackAt("text", insertIndex);
            // Get the updated tracks array after creating the new track
            const updatedTracks = useTimelineStore.getState().tracks;
            const newTargetTrack = updatedTracks.find(
              (t) => t.id === targetTrackId
            );
            if (!newTargetTrack) return;
            targetTrack = newTargetTrack;
          }

          // Check for overlaps with existing elements in target track
          const newElementDuration = 5; // Default text duration
          const textSnappedTime = getDropSnappedTime(
            newStartTime,
            newElementDuration
          );
          const newElementEnd = textSnappedTime + newElementDuration;

          const hasOverlap = targetTrack.elements.some((existingElement) => {
            const existingStart = existingElement.startTime;
            const existingEnd =
              existingElement.startTime +
              (existingElement.duration -
                existingElement.trimStart -
                existingElement.trimEnd);

            // Check if elements overlap
            return (
              textSnappedTime < existingEnd && newElementEnd > existingStart
            );
          });

          if (hasOverlap) {
            toast.error(
              "Cannot place element here - it would overlap with existing elements"
            );
            return;
          }

          addElementToTrack(targetTrackId, {
            ...DEFAULT_TEXT_ELEMENT,
            name: dragData.name || DEFAULT_TEXT_ELEMENT.name,
            content: dragData.content || DEFAULT_TEXT_ELEMENT.content,
            startTime: textSnappedTime,
          });
        } else {
          // Handle media items
          const mediaItem = mediaFiles.find((item) => item.id === dragData.id);

          if (!mediaItem) {
            toast.error("Media item not found");
            return;
          }

          let targetTrackId = track.id;

          // Check if track type is compatible
          const isVideoOrImage =
            dragData.type === "video" || dragData.type === "image";
          const isAudio = dragData.type === "audio";
          const isCompatible = isVideoOrImage
            ? canElementGoOnTrack("media", track.type)
            : isAudio
              ? canElementGoOnTrack("media", track.type)
              : false;

          let targetTrack = tracks.find((t) => t.id === targetTrackId);

          // Handle position-aware track creation for media elements
          if (!isCompatible || dropPosition !== "on") {
            if (isVideoOrImage) {
              // For video/image, check if we need a main track or additional media track
              const mainTrack = getMainTrack(tracks);

              if (!mainTrack) {
                // No main track exists, create it
                targetTrackId = addTrack("media");
                const updatedTracks = useTimelineStore.getState().tracks;
                const newTargetTrack = updatedTracks.find(
                  (t) => t.id === targetTrackId
                );
                if (!newTargetTrack) return;
                targetTrack = newTargetTrack;
              } else if (
                mainTrack.elements.length === 0 &&
                dropPosition === "on"
              ) {
                // Main track exists and is empty, use it
                targetTrackId = mainTrack.id;
                targetTrack = mainTrack;
              } else {
                // Create new media track
                let insertIndex: number;

                if (dropPosition === "above") {
                  insertIndex = currentTrackIndex;
                } else if (dropPosition === "below") {
                  insertIndex = currentTrackIndex + 1;
                } else {
                  // Insert above main track
                  const mainTrackIndex = tracks.findIndex(
                    (t) => t.id === mainTrack.id
                  );
                  insertIndex = mainTrackIndex;
                }

                targetTrackId = insertTrackAt("media", insertIndex);
                const updatedTracks = useTimelineStore.getState().tracks;
                const newTargetTrack = updatedTracks.find(
                  (t) => t.id === targetTrackId
                );
                if (!newTargetTrack) return;
                targetTrack = newTargetTrack;
              }
            } else if (isAudio) {
              // Audio tracks go at the bottom
              const mainTrack = getMainTrack(tracks);
              let insertIndex: number;

              if (dropPosition === "above") {
                insertIndex = currentTrackIndex;
              } else if (dropPosition === "below") {
                insertIndex = currentTrackIndex + 1;
              } else {
                // Insert after main track (bottom area)
                if (mainTrack) {
                  const mainTrackIndex = tracks.findIndex(
                    (t) => t.id === mainTrack.id
                  );
                  insertIndex = mainTrackIndex + 1;
                } else {
                  insertIndex = tracks.length; // Bottom of timeline
                }
              }

              targetTrackId = insertTrackAt("audio", insertIndex);
              const updatedTracks = useTimelineStore.getState().tracks;
              const newTargetTrack = updatedTracks.find(
                (t) => t.id === targetTrackId
              );
              if (!newTargetTrack) return;
              targetTrack = newTargetTrack;
            }
          }

          if (!targetTrack) return;

          // Check for overlaps with existing elements in target track
          const newElementDuration = mediaItem.duration || 5;
          const mediaSnappedTime = getDropSnappedTime(
            newStartTime,
            newElementDuration
          );
          const newElementEnd = mediaSnappedTime + newElementDuration;

          const hasOverlap = targetTrack.elements.some((existingElement) => {
            const existingStart = existingElement.startTime;
            const existingEnd =
              existingElement.startTime +
              (existingElement.duration -
                existingElement.trimStart -
                existingElement.trimEnd);

            // Check if elements overlap
            return (
              mediaSnappedTime < existingEnd && newElementEnd > existingStart
            );
          });

          if (hasOverlap) {
            toast.error(
              "Cannot place element here - it would overlap with existing elements"
            );
            return;
          }

          addElementToTrack(targetTrackId, {
            type: "media",
            mediaId: mediaItem.id,
            name: mediaItem.name,
            duration: mediaItem.duration || 5,
            startTime: mediaSnappedTime,
            trimStart: 0,
            trimEnd: 0,
          });
        }
      } else if (hasFiles) {
        // External file drops
        const { activeProject } = useProjectStore.getState();
        const { addMediaFile } = useMediaStore.getState();
        const { addElementToTrack } = useTimelineStore.getState();

        if (!activeProject) {
          toast.error("No active project");
          return;
        }

        // Process and add files to new timeline tracks at playhead position
        processMediaFiles(e.dataTransfer.files)
          .then(async (processedItems) => {
            for (const processedItem of processedItems) {
              await addMediaFile(activeProject.id, processedItem);
              const currentMediaFiles = mediaFiles;
              const addedItem = currentMediaFiles.find(
                (item) =>
                  item.name === processedItem.name &&
                  item.url === processedItem.url
              );

              if (addedItem) {
                const trackType: TrackType =
                  addedItem.type === "audio" ? "audio" : "media";
                const targetTrackId = insertTrackAt(trackType, 0);

                addElementToTrack(targetTrackId, {
                  type: "media",
                  mediaId: addedItem.id,
                  name: addedItem.name,
                  duration: addedItem.duration || 5,
                  startTime: currentTime,
                  trimStart: 0,
                  trimEnd: 0,
                });
              }
            }
          })
          .catch((error) => {
            console.error("Error processing external files:", error);
            toast.error("Failed to process dropped files");
          });
      }
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Failed to add media to track");
    }
  };

  return (
    <div
      className="w-full h-full hover:bg-muted/20"
      onClick={(e) => {
        // If clicking empty area (not on an element), deselect all elements
        if (!(e.target as HTMLElement).closest(".timeline-element")) {
          clearSelectedElements();
        }
      }}
      onDragOver={handleTrackDragOver}
      onDragEnter={handleTrackDragEnter}
      onDragLeave={handleTrackDragLeave}
      onDrop={handleTrackDrop}
    >
      <div
        ref={timelineRef}
        className="h-full relative track-elements-container min-w-full"
        data-track-id={track.id}
      >
        {track.elements.length === 0 ? (
          <div
            className={`h-full w-full rounded-sm border-2 border-dashed flex items-center justify-center text-xs text-muted-foreground transition-colors ${
              isDropping
                ? wouldOverlap
                  ? "border-red-500 bg-red-500/10 text-red-600"
                  : "border-blue-500 bg-blue-500/10 text-blue-600"
                : "border-muted/30"
            }`}
          >
            {isDropping
              ? wouldOverlap
                ? "Cannot drop - would overlap"
                : "Drop element here"
              : ""}
          </div>
        ) : (
          <>
            {track.elements.map((element) => {
              const isSelected = selectedElements.some(
                (c) => c.trackId === track.id && c.elementId === element.id
              );

              const handleElementSplit = () => {
                const { currentTime } = usePlaybackStore();
                const { splitSelected } = useTimelineStore();
                const splitTime = currentTime;
                const effectiveStart = element.startTime;
                const effectiveEnd =
                  element.startTime +
                  (element.duration - element.trimStart - element.trimEnd);

                if (splitTime > effectiveStart && splitTime < effectiveEnd) {
                  splitSelected(splitTime, track.id, element.id);
                } else {
                  toast.error("Playhead must be within element to split");
                }
              };

              const handleElementDuplicate = () => {
                const { addElementToTrack } = useTimelineStore.getState();
                const { id, ...elementWithoutId } = element;
                addElementToTrack(track.id, {
                  ...elementWithoutId,
                  name: element.name + " (copy)",
                  startTime:
                    element.startTime +
                    (element.duration - element.trimStart - element.trimEnd) +
                    0.1,
                });
              };

              const handleElementDelete = () => {
                const { deleteSelected } = useTimelineStore.getState();
                deleteSelected(track.id, element.id);
              };

              return (
                <TimelineElement
                  key={element.id}
                  element={element}
                  track={track}
                  zoomLevel={zoomLevel}
                  isSelected={isSelected}
                  onElementMouseDown={handleElementMouseDown}
                  onElementClick={handleElementClick}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
