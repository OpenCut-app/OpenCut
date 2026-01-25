import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import type { TextElement, TimelineTrack } from "@/types/timeline";

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

type ToolArgs = Record<string, unknown>;

// Tool executor that maps tool calls to store actions
export function executeToolCall(
  toolName: string,
  args: ToolArgs
): ToolExecutionResult {
  try {
    switch (toolName) {
      case "add_text_element":
        return addTextElement(args);
      case "update_text_element":
        return updateTextElement(args);
      case "update_element_timing":
        return updateElementTiming(args);
      case "split_element":
        return splitElement(args);
      case "delete_element":
        return deleteElement(args);
      case "duplicate_element":
        return duplicateElement(args);
      case "play_pause":
        return playPause(args);
      case "seek_to_time":
        return seekToTime(args);
      case "set_playback_speed":
        return setPlaybackSpeed(args);
      case "get_timeline_state":
        return getTimelineState();
      case "get_selected_elements":
        return getSelectedElements();
      case "undo":
        return undo();
      case "redo":
        return redo();
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function addTextElement(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const playbackStore = usePlaybackStore.getState();

  const content = (args.content as string) || "New Text";
  const startTime =
    typeof args.startTime === "number"
      ? args.startTime
      : playbackStore.currentTime;
  const duration =
    typeof args.duration === "number"
      ? args.duration
      : TIMELINE_CONSTANTS.DEFAULT_TEXT_DURATION;

  const textElement: Omit<TextElement, "id"> = {
    type: "text",
    name: content.slice(0, 20) || "Text",
    content,
    duration,
    startTime,
    trimStart: 0,
    trimEnd: 0,
    fontSize:
      typeof args.fontSize === "number"
        ? args.fontSize
        : DEFAULT_TEXT_ELEMENT.fontSize,
    fontFamily: DEFAULT_TEXT_ELEMENT.fontFamily,
    color: (args.color as string) || DEFAULT_TEXT_ELEMENT.color,
    backgroundColor: DEFAULT_TEXT_ELEMENT.backgroundColor,
    backgroundRadius: DEFAULT_TEXT_ELEMENT.backgroundRadius,
    backgroundPaddingX: DEFAULT_TEXT_ELEMENT.backgroundPaddingX,
    backgroundPaddingY: DEFAULT_TEXT_ELEMENT.backgroundPaddingY,
    outlineColor: DEFAULT_TEXT_ELEMENT.outlineColor,
    outlineWidth: DEFAULT_TEXT_ELEMENT.outlineWidth,
    boxShadowColor: DEFAULT_TEXT_ELEMENT.boxShadowColor,
    boxShadowOffsetX: DEFAULT_TEXT_ELEMENT.boxShadowOffsetX,
    boxShadowOffsetY: DEFAULT_TEXT_ELEMENT.boxShadowOffsetY,
    textAlign:
      (args.textAlign as "left" | "center" | "right") ||
      DEFAULT_TEXT_ELEMENT.textAlign,
    fontWeight:
      (args.fontWeight as "normal" | "bold") || DEFAULT_TEXT_ELEMENT.fontWeight,
    fontStyle: DEFAULT_TEXT_ELEMENT.fontStyle,
    textDecoration: DEFAULT_TEXT_ELEMENT.textDecoration,
    x: typeof args.x === "number" ? args.x : DEFAULT_TEXT_ELEMENT.x,
    y: typeof args.y === "number" ? args.y : DEFAULT_TEXT_ELEMENT.y,
    rotation: DEFAULT_TEXT_ELEMENT.rotation,
    opacity: DEFAULT_TEXT_ELEMENT.opacity,
  };

  // Use addElementAtTime which creates a new text track automatically
  const success = timelineStore.addElementAtTime(
    textElement as TextElement,
    startTime
  );

  return {
    success,
    result: success
      ? { message: `Added text "${content}" at ${startTime.toFixed(1)}s` }
      : { message: "Failed to add text element" },
  };
}

function updateTextElement(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const elementId = args.elementId as string;
  const trackId = args.trackId as string;

  if (!elementId || !trackId) {
    return { success: false, error: "elementId and trackId are required" };
  }

  const updates: Partial<
    Pick<
      TextElement,
      | "content"
      | "fontSize"
      | "color"
      | "textAlign"
      | "fontWeight"
      | "x"
      | "y"
      | "opacity"
    >
  > = {};

  if (args.content !== undefined) updates.content = args.content as string;
  if (args.fontSize !== undefined) updates.fontSize = args.fontSize as number;
  if (args.color !== undefined) updates.color = args.color as string;
  if (args.textAlign !== undefined)
    updates.textAlign = args.textAlign as "left" | "center" | "right";
  if (args.fontWeight !== undefined)
    updates.fontWeight = args.fontWeight as "normal" | "bold";
  if (args.x !== undefined) updates.x = args.x as number;
  if (args.y !== undefined) updates.y = args.y as number;
  if (args.opacity !== undefined) updates.opacity = args.opacity as number;

  timelineStore.updateTextElement(trackId, elementId, updates);

  return {
    success: true,
    result: { message: "Updated text element", updates },
  };
}

function updateElementTiming(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const trackId = args.trackId as string;
  const elementId = args.elementId as string;

  if (!trackId || !elementId) {
    return { success: false, error: "trackId and elementId are required" };
  }

  if (typeof args.startTime === "number") {
    timelineStore.updateElementStartTime(trackId, elementId, args.startTime);
  }

  if (typeof args.duration === "number") {
    timelineStore.updateElementDuration(trackId, elementId, args.duration);
  }

  return {
    success: true,
    result: { message: "Updated element timing" },
  };
}

function splitElement(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const playbackStore = usePlaybackStore.getState();

  const trackId = args.trackId as string | undefined;
  const elementId = args.elementId as string | undefined;
  const splitTime = playbackStore.currentTime;

  timelineStore.splitSelected(splitTime, trackId, elementId);

  return {
    success: true,
    result: { message: `Split element at ${splitTime.toFixed(1)}s` },
  };
}

function deleteElement(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();

  const trackId = args.trackId as string | undefined;
  const elementId = args.elementId as string | undefined;

  timelineStore.deleteSelected(trackId, elementId);

  return {
    success: true,
    result: { message: "Deleted element(s)" },
  };
}

function duplicateElement(args: ToolArgs): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const trackId = args.trackId as string;
  const elementId = args.elementId as string;

  if (!trackId || !elementId) {
    return { success: false, error: "trackId and elementId are required" };
  }

  timelineStore.duplicateElement(trackId, elementId);

  return {
    success: true,
    result: { message: "Duplicated element" },
  };
}

function playPause(args: ToolArgs): ToolExecutionResult {
  const playbackStore = usePlaybackStore.getState();
  const action = args.action as "play" | "pause" | "toggle" | undefined;

  if (action === "play") {
    playbackStore.play();
  } else if (action === "pause") {
    playbackStore.pause();
  } else {
    playbackStore.toggle();
  }

  return {
    success: true,
    result: {
      message: `Playback ${action || "toggled"}`,
      isPlaying: usePlaybackStore.getState().isPlaying,
    },
  };
}

function seekToTime(args: ToolArgs): ToolExecutionResult {
  const playbackStore = usePlaybackStore.getState();
  const time = args.time as number;

  if (typeof time !== "number" || time < 0) {
    return { success: false, error: "Valid time (>= 0) is required" };
  }

  playbackStore.seek(time);

  return {
    success: true,
    result: { message: `Seeked to ${time.toFixed(1)}s` },
  };
}

function setPlaybackSpeed(args: ToolArgs): ToolExecutionResult {
  const playbackStore = usePlaybackStore.getState();
  const speed = args.speed as number;

  if (typeof speed !== "number" || speed < 0.1 || speed > 2.0) {
    return { success: false, error: "Speed must be between 0.1 and 2.0" };
  }

  playbackStore.setSpeed(speed);

  return {
    success: true,
    result: { message: `Playback speed set to ${speed}x` },
  };
}

function getTimelineState(): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const playbackStore = usePlaybackStore.getState();

  const tracks = timelineStore.tracks.map((track: TimelineTrack) => ({
    id: track.id,
    name: track.name,
    type: track.type,
    isMain: track.isMain,
    muted: track.muted,
    elements: track.elements.map((el) => ({
      id: el.id,
      name: el.name,
      type: el.type,
      startTime: el.startTime,
      duration: el.duration,
      trimStart: el.trimStart,
      trimEnd: el.trimEnd,
      effectiveDuration: el.duration - el.trimStart - el.trimEnd,
      ...(el.type === "text"
        ? {
            content: el.content,
            fontSize: el.fontSize,
            color: el.color,
          }
        : {}),
    })),
  }));

  return {
    success: true,
    result: {
      currentTime: playbackStore.currentTime,
      duration: playbackStore.duration,
      isPlaying: playbackStore.isPlaying,
      totalDuration: timelineStore.getTotalDuration(),
      tracks,
    },
  };
}

function getSelectedElements(): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  const selectedElements = timelineStore.selectedElements;

  const elements = selectedElements.map(({ trackId, elementId }) => {
    const track = timelineStore.tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);
    return {
      trackId,
      elementId,
      trackName: track?.name,
      element: element
        ? {
            name: element.name,
            type: element.type,
            startTime: element.startTime,
            duration: element.duration,
            ...(element.type === "text"
              ? {
                  content: element.content,
                  fontSize: element.fontSize,
                  color: element.color,
                }
              : {}),
          }
        : null,
    };
  });

  return {
    success: true,
    result: {
      count: elements.length,
      elements,
    },
  };
}

function undo(): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  timelineStore.undo();

  return {
    success: true,
    result: { message: "Undone last action" },
  };
}

function redo(): ToolExecutionResult {
  const timelineStore = useTimelineStore.getState();
  timelineStore.redo();

  return {
    success: true,
    result: { message: "Redone last action" },
  };
}
