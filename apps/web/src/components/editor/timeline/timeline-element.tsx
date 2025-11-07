"use client";

import {
  Scissors,
  Trash2,
  Copy,
  Search,
  RefreshCw,
  EyeOff,
  Eye,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import AudioWaveform from "../audio-waveform";
import { toast } from "sonner";
import { TimelineElementProps, MediaElement } from "@/types/timeline";
import { useTimelineElementResize } from "@/hooks/use-timeline-element-resize";
import {
  getTrackElementClasses,
  TIMELINE_CONSTANTS,
  getTrackHeight,
} from "@/constants/timeline-constants";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../../ui/context-menu";
import { useMediaPanelStore } from "../media-panel/store";

export function TimelineElement({
  element,
  track,
  zoomLevel,
  isSelected,
  onElementMouseDown,
  onElementClick,
}: TimelineElementProps) {
  const { mediaFiles } = useMediaStore();
  const {
    dragState,
    copySelected,
    selectedElements,
    deleteSelected,
    splitSelected,
    toggleSelectedHidden,
    toggleSelectedMuted,
    duplicateElement,
    revealElementInMedia,
    replaceElementWithFile,
    getContextMenuState,
  } = useTimelineStore();
  const { currentTime } = usePlaybackStore();

  const mediaItem =
    element.type === "media"
      ? mediaFiles.find((file) => file.id === element.mediaId)
      : null;
  const hasAudio = mediaItem?.type === "audio" || mediaItem?.type === "video";

  const { resizing, handleResizeStart, handleResizeMove, handleResizeEnd } =
    useTimelineElementResize({
      element,
      track,
      zoomLevel,
    });

  const {
    isMultipleSelected,
    isCurrentElementSelected,
    hasAudioElements,
    canSplitSelected,
  } = getContextMenuState(track.id, element.id);

  const effectiveDuration =
    element.duration - element.trimStart - element.trimEnd;
  const elementWidth = Math.max(
    TIMELINE_CONSTANTS.ELEMENT_MIN_WIDTH,
    effectiveDuration * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel
  );

  const isBeingDragged = dragState.elementId === element.id;
  const elementStartTime =
    isBeingDragged && dragState.isDragging
      ? dragState.currentTime
      : element.startTime;

  const elementLeft = elementStartTime * 50 * zoomLevel;

  const handleElementSplitContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    splitSelected(
      currentTime,
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id
    );
  };

  const handleElementDuplicateContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateElement(track.id, element.id);
  };

  const handleElementCopyContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    copySelected();
  };

  const handleElementDeleteContext = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSelected(
      isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
      isMultipleSelected && isCurrentElementSelected ? undefined : element.id
    );
  };

  const handleToggleElementContext = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (hasAudio && element.type === "media") {
      toggleSelectedMuted(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id
      );
    } else {
      toggleSelectedHidden(
        isMultipleSelected && isCurrentElementSelected ? undefined : track.id,
        isMultipleSelected && isCurrentElementSelected ? undefined : element.id
      );
    }
  };

  const handleReplaceClip = (e: React.MouseEvent) => {
    e.stopPropagation();

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*,audio/*,image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await replaceElementWithFile(track.id, element.id, file);
      }
    };
    input.click();
  };

  const handleRevealInMedia = (e: React.MouseEvent) => {
    e.stopPropagation();
    revealElementInMedia(element.id);
  };

  const renderElementContent = () => {
    if (element.type === "text") {
      return (
        <div className="w-full h-full flex items-center justify-start pl-2">
          <span className="text-xs text-white truncate">{element.content}</span>
        </div>
      );
    }

    const mediaItem = mediaFiles.find((file) => file.id === element.mediaId);
    if (!mediaItem) {
      return (
        <span className="text-xs text-foreground/80 truncate">
          {element.name}
        </span>
      );
    }

    if (
      mediaItem.type === "image" ||
      (mediaItem.type === "video" && mediaItem.thumbnailUrl)
    ) {
      const trackHeight = getTrackHeight(track.type);
      const tileWidth = trackHeight * (16 / 9);

      const imageUrl =
        mediaItem.type === "image" ? mediaItem.url : mediaItem.thumbnailUrl;

      return (
        <div className="w-full h-full flex items-center justify-center">
          <div
            className={`w-full h-full relative ${
              isSelected ? "bg-primary" : "bg-transparent"
            }`}
          >
            <div
              className={`absolute top-[0.25rem] bottom-[0.25rem] left-0 right-0`}
              style={{
                backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
                backgroundRepeat: "repeat-x",
                backgroundSize: `${tileWidth}px ${trackHeight}px`,
                backgroundPosition: "left center",
                pointerEvents: "none",
              }}
              aria-label={`Tiled ${mediaItem.type === "image" ? "background" : "thumbnail"} of ${mediaItem.name}`}
            />
          </div>
        </div>
      );
    }

    if (mediaItem.type === "audio") {
      return (
        <div className="w-full h-full flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AudioWaveform
              audioUrl={mediaItem.url || ""}
              height={24}
              className="w-full"
            />
          </div>
        </div>
      );
    }

    return (
      <span className="text-xs text-foreground/80 truncate">
        {element.name}
      </span>
    );
  };

  const handleElementMouseDown = (e: React.MouseEvent) => {
    if (onElementMouseDown) {
      onElementMouseDown(e, element);
    }
  };

  const isMuted = element.type === "media" && element.muted;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={`absolute top-0 h-full select-none timeline-element ${
            isBeingDragged ? "z-50" : "z-10"
          }`}
          style={{
            left: `${elementLeft}px`,
            width: `${elementWidth}px`,
          }}
          data-element-id={element.id}
          data-track-id={track.id}
          onMouseMove={resizing ? handleResizeMove : undefined}
          onMouseUp={resizing ? handleResizeEnd : undefined}
          onMouseLeave={resizing ? handleResizeEnd : undefined}
        >
          <div
            className={`relative h-full rounded-[0.5rem] cursor-pointer overflow-hidden ${getTrackElementClasses(
              track.type
            )} ${isSelected ? "" : ""} ${
              isBeingDragged ? "z-50" : "z-10"
            } ${element.hidden ? "opacity-50" : ""}`}
            onClick={(e) => onElementClick && onElementClick(e, element)}
            onMouseDown={handleElementMouseDown}
            onContextMenu={(e) =>
              onElementMouseDown && onElementMouseDown(e, element)
            }
          >
            <div className="absolute inset-0 flex items-center h-full">
              {renderElementContent()}
            </div>

            {(hasAudio ? isMuted : element.hidden) && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center pointer-events-none">
                {hasAudio ? (
                  <VolumeX className="h-6 w-6 text-white" />
                ) : (
                  <EyeOff className="h-6 w-6 text-white" />
                )}
              </div>
            )}

            {isSelected && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-[0.6rem] cursor-w-resize bg-primary z-50 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "left")}
                >
                  <div className="w-[0.2rem] h-[1.5rem] bg-foreground/75 rounded-full" />
                </div>
                <div
                  className="absolute right-0 top-0 bottom-0 w-[0.6rem] cursor-e-resize bg-primary z-50 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, element.id, "right")}
                >
                  <div className="w-[0.2rem] h-[1.5rem] bg-foreground/75 rounded-full" />
                </div>
              </>
            )}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="z-200">
        {(!isMultipleSelected ||
          (isMultipleSelected &&
            isCurrentElementSelected &&
            canSplitSelected)) && (
          <ContextMenuItem onClick={handleElementSplitContext}>
            <Scissors className="h-4 w-4 mr-2" />
            {isMultipleSelected && isCurrentElementSelected
              ? `Split ${selectedElements.length} elements at playhead`
              : "Split at playhead"}
          </ContextMenuItem>
        )}

        <ContextMenuItem onClick={handleElementCopyContext}>
          <Copy className="h-4 w-4 mr-2" />
          {isMultipleSelected && isCurrentElementSelected
            ? `Copy ${selectedElements.length} elements`
            : "Copy element"}
        </ContextMenuItem>

        <ContextMenuItem onClick={handleToggleElementContext}>
          {isMultipleSelected && isCurrentElementSelected ? (
            hasAudioElements ? (
              <VolumeX className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )
          ) : hasAudio ? (
            isMuted ? (
              <Volume2 className="h-4 w-4 mr-2" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2" />
            )
          ) : element.hidden ? (
            <Eye className="h-4 w-4 mr-2" />
          ) : (
            <EyeOff className="h-4 w-4 mr-2" />
          )}
          <span>
            {isMultipleSelected && isCurrentElementSelected
              ? hasAudioElements
                ? `Toggle mute ${selectedElements.length} elements`
                : `Toggle visibility ${selectedElements.length} elements`
              : hasAudio
                ? isMuted
                  ? "Unmute"
                  : "Mute"
                : element.hidden
                  ? "Show"
                  : "Hide"}{" "}
            {!isMultipleSelected && (element.type === "text" ? "text" : "clip")}
          </span>
        </ContextMenuItem>

        {!isMultipleSelected && (
          <ContextMenuItem onClick={handleElementDuplicateContext}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate {element.type === "text" ? "text" : "clip"}
          </ContextMenuItem>
        )}

        {!isMultipleSelected && element.type === "media" && (
          <>
            <ContextMenuItem onClick={handleRevealInMedia}>
              <Search className="h-4 w-4 mr-2" />
              Reveal in media
            </ContextMenuItem>
            <ContextMenuItem onClick={handleReplaceClip}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Replace clip
            </ContextMenuItem>
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={handleElementDeleteContext}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isMultipleSelected && isCurrentElementSelected
            ? `Delete ${selectedElements.length} elements`
            : `Delete ${element.type === "text" ? "text" : "clip"}`}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
