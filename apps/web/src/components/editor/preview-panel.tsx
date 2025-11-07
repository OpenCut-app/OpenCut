"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { MediaFile } from "@/types/media";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Play, Pause, Expand, SkipBack, SkipForward } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { renderTimelineFrame } from "@/lib/timeline-renderer";
import { cn } from "@/lib/utils";
import { formatTimeCode } from "@/lib/time";
import { EditableTimecode } from "@/components/ui/editable-timecode";
import { useFrameCache } from "@/hooks/use-frame-cache";
import { useSceneStore } from "@/stores/scene-store";
import {
  DEFAULT_CANVAS_SIZE,
  DEFAULT_FPS,
  useProjectStore,
} from "@/stores/project-store";
import { TextElementDragState } from "@/types/editor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutGuideOverlay } from "./layout-guide-overlay";
import { Label } from "../ui/label";
import { SocialsIcon } from "../icons";
import { PLATFORM_LAYOUTS, type PlatformLayout } from "@/stores/editor-store";

interface ActiveElement {
  element: TimelineElement;
  track: TimelineTrack;
  mediaItem: MediaFile | null;
}

export function PreviewPanel() {
  const { tracks, getTotalDuration, updateTextElement } = useTimelineStore();
  const { mediaFiles } = useMediaStore();
  const { currentTime, toggle, setCurrentTime } = usePlaybackStore();
  const { isPlaying, volume, muted } = usePlaybackStore();
  const { activeProject } = useProjectStore();
  const { currentScene } = useSceneStore();
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getCachedFrame, cacheFrame, invalidateCache, preRenderNearbyFrames } =
    useFrameCache();
  const lastFrameTimeRef = useRef(0);
  const renderSeqRef = useRef(0);
  const offscreenCanvasRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(
    null
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const canvasSize = activeProject?.canvasSize || DEFAULT_CANVAS_SIZE;
  const [dragState, setDragState] = useState<TextElementDragState>({
    isDragging: false,
    elementId: null,
    trackId: null,
    startX: 0,
    startY: 0,
    initialElementX: 0,
    initialElementY: 0,
    currentX: 0,
    currentY: 0,
    elementWidth: 0,
    elementHeight: 0,
  });

  useEffect(() => {
    const updatePreviewSize = () => {
      if (!containerRef.current) return;

      let availableWidth, availableHeight;

      if (isExpanded) {
        const controlsHeight = 80;
        const marginSpace = 24;
        availableWidth = window.innerWidth - marginSpace;
        availableHeight = window.innerHeight - controlsHeight - marginSpace;
      } else {
        const container = containerRef.current.getBoundingClientRect();
        const computedStyle = getComputedStyle(containerRef.current);
        const paddingTop = parseFloat(computedStyle.paddingTop);
        const paddingBottom = parseFloat(computedStyle.paddingBottom);
        const paddingLeft = parseFloat(computedStyle.paddingLeft);
        const paddingRight = parseFloat(computedStyle.paddingRight);
        const gap = parseFloat(computedStyle.gap) || 16;
        const toolbar = containerRef.current.querySelector("[data-toolbar]");
        const toolbarHeight = toolbar
          ? toolbar.getBoundingClientRect().height
          : 0;

        availableWidth = container.width - paddingLeft - paddingRight;
        availableHeight =
          container.height -
          paddingTop -
          paddingBottom -
          toolbarHeight -
          (toolbarHeight > 0 ? gap : 0);
      }

      const targetRatio = canvasSize.width / canvasSize.height;
      const containerRatio = availableWidth / availableHeight;
      let width, height;

      if (containerRatio > targetRatio) {
        height = availableHeight * (isExpanded ? 0.95 : 1);
        width = height * targetRatio;
      } else {
        width = availableWidth * (isExpanded ? 0.95 : 1);
        height = width / targetRatio;
      }

      setPreviewDimensions({ width, height });
    };

    updatePreviewSize();
    const resizeObserver = new ResizeObserver(updatePreviewSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    if (isExpanded) {
      window.addEventListener("resize", updatePreviewSize);
    }

    return () => {
      resizeObserver.disconnect();
      if (isExpanded) {
        window.removeEventListener("resize", updatePreviewSize);
      }
    };
  }, [canvasSize.width, canvasSize.height, isExpanded]);

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging) return;

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      const scaleRatio = previewDimensions.width / canvasSize.width;
      const newX = dragState.initialElementX + deltaX / scaleRatio;
      const newY = dragState.initialElementY + deltaY / scaleRatio;

      const halfWidth = dragState.elementWidth / scaleRatio / 2;
      const halfHeight = dragState.elementHeight / scaleRatio / 2;

      const constrainedX = Math.max(
        -canvasSize.width / 2 + halfWidth,
        Math.min(canvasSize.width / 2 - halfWidth, newX)
      );
      const constrainedY = Math.max(
        -canvasSize.height / 2 + halfHeight,
        Math.min(canvasSize.height / 2 - halfHeight, newY)
      );

      setDragState((prev) => ({
        ...prev,
        currentX: constrainedX,
        currentY: constrainedY,
      }));
    };

    const handleMouseUp = () => {
      if (dragState.isDragging && dragState.trackId && dragState.elementId) {
        updateTextElement(dragState.trackId, dragState.elementId, {
          x: dragState.currentX,
          y: dragState.currentY,
        });
      }
      setDragState((prev) => ({ ...prev, isDragging: false }));
    };

    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragState, previewDimensions, canvasSize, updateTextElement]);

  // Clear the frame cache when background settings change since they affect rendering
  useEffect(() => {
    invalidateCache();
  }, [
    mediaFiles,
    activeProject?.backgroundColor,
    activeProject?.backgroundType,
    invalidateCache,
  ]);

  const handleTextMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    element: any,
    trackId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    setDragState({
      isDragging: true,
      elementId: element.id,
      trackId,
      startX: e.clientX,
      startY: e.clientY,
      initialElementX: element.x,
      initialElementY: element.y,
      currentX: element.x,
      currentY: element.y,
      elementWidth: rect.width,
      elementHeight: rect.height,
    });
  };

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasAnyElements = tracks.some((track) => track.elements.length > 0);
  const shouldRenderPreview = hasAnyElements || activeProject?.backgroundType;
  const getActiveElements = (): ActiveElement[] => {
    const activeElements: ActiveElement[] = [];

    // Iterate tracks from bottom to top so topmost track renders last (on top)
    [...tracks].reverse().forEach((track) => {
      track.elements.forEach((element) => {
        if (element.hidden) return;
        const elementStart = element.startTime;
        const elementEnd =
          element.startTime +
          (element.duration - element.trimStart - element.trimEnd);

        if (currentTime >= elementStart && currentTime < elementEnd) {
          let mediaItem = null;
          if (element.type === "media") {
            mediaItem =
              element.mediaId === "test"
                ? null
                : mediaFiles.find((item) => item.id === element.mediaId) ||
                  null;
          }
          activeElements.push({ element, track, mediaItem });
        }
      });
    });

    return activeElements;
  };

  const activeElements = getActiveElements();

  // Ensure first frame after mount/seek renders immediately
  useEffect(() => {
    const onSeek = () => {
      lastFrameTimeRef.current = -Infinity;
      renderSeqRef.current++;
    };
    window.addEventListener("playback-seek", onSeek as EventListener);
    lastFrameTimeRef.current = -Infinity;
    return () => {
      window.removeEventListener("playback-seek", onSeek as EventListener);
    };
  }, []);

  // Web Audio: schedule only on play/pause/seek/volume/mute changes
  useEffect(() => {
    const stopAll = () => {
      for (const src of playingSourcesRef.current) {
        try {
          src.stop();
        } catch {}
      }
      playingSourcesRef.current.clear();
    };

    type WebAudioWindow = Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const ensureAudioGraph = async () => {
      if (!audioContextRef.current) {
        const win = window as WebAudioWindow;
        const Ctx = win.AudioContext ?? win.webkitAudioContext;
        if (!Ctx) return;
        audioContextRef.current = new Ctx();
      }
      if (!audioGainRef.current) {
        audioGainRef.current = audioContextRef.current!.createGain();
        audioGainRef.current.connect(audioContextRef.current!.destination);
      }
      if (audioContextRef.current!.state === "suspended") {
        try {
          await audioContextRef.current!.resume();
        } catch {}
      }
      const gainValue = muted ? 0 : Math.max(0, Math.min(1, volume));
      audioGainRef.current!.gain.setValueAtTime(
        gainValue,
        audioContextRef.current!.currentTime
      );
    };

    const scheduleNow = async () => {
      await ensureAudioGraph();
      const audioCtx = audioContextRef.current!;
      const gain = audioGainRef.current!;

      const tracksSnapshot = useTimelineStore.getState().tracks;
      const mediaList = mediaFiles;
      const idToMedia = new Map(mediaList.map((m) => [m.id, m] as const));
      const playbackNow = usePlaybackStore.getState().currentTime;

      const audible: Array<{
        id: string;
        elementStart: number;
        trimStart: number;
        trimEnd: number;
        duration: number;
        muted: boolean;
        trackMuted: boolean;
      }> = [];
      const uniqueIds = new Set<string>();
      for (const track of tracksSnapshot) {
        for (const element of track.elements) {
          if (element.type !== "media") continue;
          const media = idToMedia.get(element.mediaId);
          if (!media || media.type !== "audio") continue;
          const visibleDuration =
            element.duration - element.trimStart - element.trimEnd;
          if (visibleDuration <= 0) continue;
          const localTime = playbackNow - element.startTime + element.trimStart;
          if (localTime < 0 || localTime >= visibleDuration) continue;
          audible.push({
            id: media.id,
            elementStart: element.startTime,
            trimStart: element.trimStart,
            trimEnd: element.trimEnd,
            duration: element.duration,
            muted: !!element.muted,
            trackMuted: !!track.muted,
          });
          uniqueIds.add(media.id);
        }
      }

      if (audible.length === 0) return;

      // Decode buffers as needed
      const decodePromises: Array<Promise<void>> = [];
      for (const id of uniqueIds) {
        if (!audioBuffersRef.current.has(id)) {
          const mediaItem = idToMedia.get(id);
          if (!mediaItem) continue;
          const p = (async () => {
            const arr = await mediaItem.file.arrayBuffer();
            const buf = await audioCtx.decodeAudioData(arr.slice(0));
            audioBuffersRef.current.set(id, buf);
          })();
          decodePromises.push(p);
        }
      }
      await Promise.all(decodePromises);

      const startAt = audioCtx.currentTime + 0.02;
      for (const entry of audible) {
        if (entry.muted || entry.trackMuted) continue;
        const buffer = audioBuffersRef.current.get(entry.id);
        if (!buffer) continue;
        const visibleDuration =
          entry.duration - entry.trimStart - entry.trimEnd;
        const localTime = Math.max(
          0,
          playbackNow - entry.elementStart + entry.trimStart
        );
        const playDuration = Math.max(0, visibleDuration - localTime);
        if (playDuration <= 0) continue;
        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        try {
          src.start(startAt, localTime, playDuration);
          playingSourcesRef.current.add(src);
        } catch {}
      }
    };

    const onSeek = () => {
      if (!isPlaying) return;
      for (const src of playingSourcesRef.current) {
        try {
          src.stop();
        } catch {}
      }
      playingSourcesRef.current.clear();
      void scheduleNow();
    };

    // Apply volume/mute changes immediately
    void ensureAudioGraph();

    // Start/stop on play state changes
    for (const src of playingSourcesRef.current) {
      try {
        src.stop();
      } catch {}
    }
    playingSourcesRef.current.clear();
    if (isPlaying) {
      void scheduleNow();
    }

    window.addEventListener("playback-seek", onSeek as EventListener);
    return () => {
      window.removeEventListener("playback-seek", onSeek as EventListener);
      for (const src of playingSourcesRef.current) {
        try {
          src.stop();
        } catch {}
      }
      playingSourcesRef.current.clear();
    };
  }, [isPlaying, volume, muted, mediaFiles]);

  // Canvas: draw current frame with caching
  useEffect(() => {
    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const mainCtx = canvas.getContext("2d");
      if (!mainCtx) return;

      // Set canvas internal resolution to avoid blurry scaling
      const displayWidth = Math.max(1, Math.floor(previewDimensions.width));
      const displayHeight = Math.max(1, Math.floor(previewDimensions.height));
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      // Throttle rendering to project FPS during playback only
      const fps = activeProject?.fps || DEFAULT_FPS;
      const minDelta = 1 / fps;
      if (isPlaying) {
        if (currentTime - lastFrameTimeRef.current < minDelta) {
          return;
        }
        lastFrameTimeRef.current = currentTime;
      }

      const cachedFrame = getCachedFrame(
        currentTime,
        tracks,
        mediaFiles,
        activeProject,
        currentScene?.id
      );
      if (cachedFrame) {
        mainCtx.putImageData(cachedFrame, 0, 0);

        // Pre-render nearby frames in background
        if (!isPlaying) {
          // Only during scrubbing to avoid interfering with playback
          preRenderNearbyFrames(
            currentTime,
            tracks,
            mediaFiles,
            activeProject,
            async (time: number) => {
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = displayWidth;
              tempCanvas.height = displayHeight;
              const tempCtx = tempCanvas.getContext("2d");
              if (!tempCtx)
                throw new Error("Failed to create temp canvas context");

              await renderTimelineFrame({
                ctx: tempCtx,
                time,
                canvasWidth: displayWidth,
                canvasHeight: displayHeight,
                tracks,
                mediaFiles,
                backgroundType: activeProject?.backgroundType,
                blurIntensity: activeProject?.blurIntensity,
                backgroundColor:
                  activeProject?.backgroundType === "blur"
                    ? undefined
                    : activeProject?.backgroundColor || "#000000",
                projectCanvasSize: canvasSize,
              });

              return tempCtx.getImageData(0, 0, displayWidth, displayHeight);
            },
            currentScene?.id,
            3
          );
        } else {
          // Small lookahead while playing
          preRenderNearbyFrames(
            currentTime,
            tracks,
            mediaFiles,
            activeProject,
            async (time: number) => {
              const tempCanvas = document.createElement("canvas");
              tempCanvas.width = displayWidth;
              tempCanvas.height = displayHeight;
              const tempCtx = tempCanvas.getContext("2d");
              if (!tempCtx)
                throw new Error("Failed to create temp canvas context");

              await renderTimelineFrame({
                ctx: tempCtx,
                time,
                canvasWidth: displayWidth,
                canvasHeight: displayHeight,
                tracks,
                mediaFiles,
                backgroundType: activeProject?.backgroundType,
                blurIntensity: activeProject?.blurIntensity,
                backgroundColor:
                  activeProject?.backgroundType === "blur"
                    ? undefined
                    : activeProject?.backgroundColor || "#000000",
                projectCanvasSize: canvasSize,
              });

              return tempCtx.getImageData(0, 0, displayWidth, displayHeight);
            },
            currentScene?.id,
            1
          );
        }
        return;
      }

      // Cache miss - render from scratch
      if (!offscreenCanvasRef.current) {
        const hasOffscreen =
          typeof (globalThis as unknown as { OffscreenCanvas?: unknown })
            .OffscreenCanvas !== "undefined";
        if (hasOffscreen) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          offscreenCanvasRef.current = new (globalThis as any).OffscreenCanvas(
            displayWidth,
            displayHeight
          ) as OffscreenCanvas;
        } else {
          const c = document.createElement("canvas");
          c.width = displayWidth;
          c.height = displayHeight;
          offscreenCanvasRef.current = c;
        }
      }
      // Ensure size matches
      if (
        offscreenCanvasRef.current &&
        (offscreenCanvasRef.current as HTMLCanvasElement).getContext
      ) {
        const c = offscreenCanvasRef.current as HTMLCanvasElement;
        if (c.width !== displayWidth || c.height !== displayHeight) {
          c.width = displayWidth;
          c.height = displayHeight;
        }
      } else {
        const c = offscreenCanvasRef.current as OffscreenCanvas;
        // @ts-ignore width/height exist on OffscreenCanvas in modern browsers
        if (
          (c as unknown as { width: number }).width !== displayWidth ||
          (c as unknown as { height: number }).height !== displayHeight
        ) {
          // @ts-ignore
          (c as unknown as { width: number }).width = displayWidth;
          // @ts-ignore
          (c as unknown as { height: number }).height = displayHeight;
        }
      }
      const offscreenCanvas = offscreenCanvasRef.current as
        | HTMLCanvasElement
        | OffscreenCanvas;
      const offCtx = (offscreenCanvas as HTMLCanvasElement).getContext
        ? (offscreenCanvas as HTMLCanvasElement).getContext("2d")
        : (offscreenCanvas as OffscreenCanvas).getContext("2d");
      if (!offCtx) return;

      await renderTimelineFrame({
        ctx: offCtx as CanvasRenderingContext2D,
        time: currentTime,
        canvasWidth: displayWidth,
        canvasHeight: displayHeight,
        tracks,
        mediaFiles,
        backgroundType: activeProject?.backgroundType,
        blurIntensity: activeProject?.blurIntensity,
        backgroundColor:
          activeProject?.backgroundType === "blur"
            ? undefined
            : activeProject?.backgroundColor || "#000000",
        projectCanvasSize: canvasSize,
      });

      const imageData = (offCtx as CanvasRenderingContext2D).getImageData(
        0,
        0,
        displayWidth,
        displayHeight
      );
      cacheFrame(
        currentTime,
        imageData,
        tracks,
        mediaFiles,
        activeProject,
        currentScene?.id
      );

      // Blit offscreen to visible canvas
      mainCtx.clearRect(0, 0, displayWidth, displayHeight);
      if ((offscreenCanvas as HTMLCanvasElement).getContext) {
        mainCtx.drawImage(offscreenCanvas as HTMLCanvasElement, 0, 0);
      } else {
        mainCtx.drawImage(
          offscreenCanvas as unknown as CanvasImageSource,
          0,
          0
        );
      }
    };

    void draw();
  }, [
    activeElements,
    currentTime,
    previewDimensions.width,
    previewDimensions.height,
    canvasSize.width,
    canvasSize.height,
    activeProject?.backgroundType,
    activeProject?.backgroundColor,
    getCachedFrame,
    cacheFrame,
    preRenderNearbyFrames,
    isPlaying,
  ]);

  // Get media elements for blur background (video/image only)
  const getBlurBackgroundElements = (): ActiveElement[] => {
    return activeElements.filter(
      ({ element, mediaItem }) =>
        element.type === "media" &&
        mediaItem &&
        (mediaItem.type === "video" || mediaItem.type === "image") &&
        element.mediaId !== "test" // Exclude test elements
    );
  };

  const blurBackgroundElements = getBlurBackgroundElements();

  // Render blur background layer (handled by canvas now)
  const renderBlurBackground = () => null;

  // Render an element (canvas handles visuals now). Audio playback to be implemented via Web Audio.
  const renderElement = (_elementData: ActiveElement) => null;

  return (
    <>
      <div className="h-full w-full flex flex-col min-h-0 min-w-0 bg-panel rounded-sm relative">
        <div
          ref={containerRef}
          className="flex-1 flex flex-col items-center justify-center min-h-0 min-w-0"
        >
          <div className="flex-1" />
          {shouldRenderPreview ? (
            <div
              ref={previewRef}
              className="relative overflow-hidden border"
              style={{
                width: previewDimensions.width,
                height: previewDimensions.height,
                background:
                  activeProject?.backgroundType === "blur"
                    ? "transparent"
                    : activeProject?.backgroundColor || "#000000",
              }}
            >
              {renderBlurBackground()}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: previewDimensions.width,
                  height: previewDimensions.height,
                }}
                aria-label="Video preview canvas"
              />
              {activeElements.length === 0 ? (
                <></>
              ) : (
                activeElements.map((elementData) => renderElement(elementData))
              )}
              <LayoutGuideOverlay />
            </div>
          ) : null}

          <div className="flex-1" />

          <PreviewToolbar
            hasAnyElements={hasAnyElements}
            onToggleExpanded={toggleExpanded}
            isExpanded={isExpanded}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            toggle={toggle}
            getTotalDuration={getTotalDuration}
          />
        </div>
      </div>

      {isExpanded && (
        <FullscreenPreview
          previewDimensions={previewDimensions}
          activeProject={activeProject}
          renderBlurBackground={renderBlurBackground}
          activeElements={activeElements}
          renderElement={renderElement}
          blurBackgroundElements={blurBackgroundElements}
          hasAnyElements={hasAnyElements}
          toggleExpanded={toggleExpanded}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          toggle={toggle}
          getTotalDuration={getTotalDuration}
        />
      )}
    </>
  );
}

function FullscreenToolbar({
  hasAnyElements,
  onToggleExpanded,
  currentTime,
  setCurrentTime,
  toggle,
  getTotalDuration,
}: {
  hasAnyElements: boolean;
  onToggleExpanded: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  toggle: () => void;
  getTotalDuration: () => number;
}) {
  const { isPlaying, seek } = usePlaybackStore();
  const { activeProject } = useProjectStore();
  const [isDragging, setIsDragging] = useState(false);

  const totalDuration = getTotalDuration();
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAnyElements) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * totalDuration;
    setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAnyElements) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const dragX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, dragX / rect.width));
      const newTime = percentage * totalDuration;
      setCurrentTime(Math.max(0, Math.min(newTime, totalDuration)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };

    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    handleMouseMove(e.nativeEvent);
  };

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 1);
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(totalDuration, currentTime + 1);
    setCurrentTime(newTime);
  };

  return (
    <div
      data-toolbar
      className="flex items-center gap-2 p-1 pt-2 w-full text-foreground relative"
    >
      <div className="flex items-center gap-1 text-[0.70rem] tabular-nums text-foreground/90">
        <EditableTimecode
          time={currentTime}
          duration={totalDuration}
          format="HH:MM:SS:FF"
          fps={activeProject?.fps || DEFAULT_FPS}
          onTimeChange={seek}
          disabled={!hasAnyElements}
          className="text-foreground/90 hover:bg-white/10"
        />
        <span className="opacity-50">/</span>
        <span>
          {formatTimeCode(
            totalDuration,
            "HH:MM:SS:FF",
            activeProject?.fps || DEFAULT_FPS
          )}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="text"
          size="icon"
          onClick={skipBackward}
          disabled={!hasAnyElements}
          className="h-auto p-0 text-foreground"
          title="Skip backward 1s"
        >
          <SkipBack className="h-3 w-3" />
        </Button>
        <Button
          variant="text"
          size="icon"
          onClick={toggle}
          disabled={!hasAnyElements}
          className="h-auto p-0 text-foreground hover:text-foreground/80"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Button
          variant="text"
          size="icon"
          onClick={skipForward}
          disabled={!hasAnyElements}
          className="h-auto p-0 text-foreground hover:text-foreground/80"
          title="Skip forward 1s"
        >
          <SkipForward className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <div
          className={cn(
            "relative h-1 rounded-full cursor-pointer flex-1 bg-foreground/20",
            !hasAnyElements && "opacity-50 cursor-not-allowed"
          )}
          onClick={hasAnyElements ? handleTimelineClick : undefined}
          onMouseDown={hasAnyElements ? handleTimelineDrag : undefined}
          style={{ userSelect: "none" }}
        >
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full bg-foreground",
              !isDragging && "duration-100"
            )}
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2 -translate-x-1/2 shadow-xs bg-foreground border border-black/20"
            style={{ left: `${progress}%` }}
          />
        </div>
      </div>

      <Button
        variant="text"
        size="icon"
        className="size-4! text-foreground/80 hover:text-foreground"
        onClick={onToggleExpanded}
        title="Exit fullscreen (Esc)"
      >
        <Expand className="size-4!" />
      </Button>
    </div>
  );
}

function FullscreenPreview({
  previewDimensions,
  activeProject,
  renderBlurBackground,
  activeElements,
  renderElement,
  blurBackgroundElements,
  hasAnyElements,
  toggleExpanded,
  currentTime,
  setCurrentTime,
  toggle,
  getTotalDuration,
}: {
  previewDimensions: { width: number; height: number };
  activeProject: any;
  renderBlurBackground: () => React.ReactNode;
  activeElements: ActiveElement[];
  renderElement: (elementData: ActiveElement, index: number) => React.ReactNode;
  blurBackgroundElements: ActiveElement[];
  hasAnyElements: boolean;
  toggleExpanded: () => void;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  toggle: () => void;
  getTotalDuration: () => number;
}) {
  return (
    <div className="fixed inset-0 z-9999 flex flex-col">
      <div className="flex-1 flex items-center justify-center bg-background">
        <div
          className="relative overflow-hidden border border-border m-3"
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
            background:
              activeProject?.backgroundType === "blur"
                ? "#1a1a1a"
                : activeProject?.backgroundColor || "#1a1a1a",
          }}
        >
          {renderBlurBackground()}
          {activeElements.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-white/60">
              No elements at current time
            </div>
          ) : (
            activeElements.map((elementData, index) =>
              renderElement(elementData, index)
            )
          )}
          <LayoutGuideOverlay />
        </div>
      </div>
      <div className="p-4 bg-background">
        <FullscreenToolbar
          hasAnyElements={hasAnyElements}
          onToggleExpanded={toggleExpanded}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          toggle={toggle}
          getTotalDuration={getTotalDuration}
        />
      </div>
    </div>
  );
}

function PreviewToolbar({
  hasAnyElements,
  onToggleExpanded,
  isExpanded,
  currentTime,
  setCurrentTime,
  toggle,
  getTotalDuration,
}: {
  hasAnyElements: boolean;
  onToggleExpanded: () => void;
  isExpanded: boolean;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  toggle: () => void;
  getTotalDuration: () => number;
}) {
  const { isPlaying } = usePlaybackStore();
  const { layoutGuide, toggleLayoutGuide } = useEditorStore();

  if (isExpanded) {
    return (
      <FullscreenToolbar
        {...{
          hasAnyElements,
          onToggleExpanded,
          currentTime,
          setCurrentTime,
          toggle,
          getTotalDuration,
        }}
      />
    );
  }

  return (
    <div
      data-toolbar
      className="flex justify-end gap-2 h-auto pb-5 pr-5 pt-4 w-full"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          size="icon"
          onClick={toggle}
          disabled={!hasAnyElements}
          className="h-auto p-0"
        >
          {isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="text"
              size="icon"
              className="h-auto p-0 mr-1"
              title="Toggle layout guide"
            >
              <SocialsIcon className="!size-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Layout guide</h4>
                <p className="text-sm text-muted-foreground">
                  Show platform-specific layout guides to help align your
                  content with interface elements like profile pictures,
                  usernames, and interaction buttons.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="none"
                    checked={layoutGuide.platform === null}
                    onCheckedChange={() =>
                      toggleLayoutGuide(layoutGuide.platform || "tiktok")
                    }
                  />
                  <Label htmlFor="none">None</Label>
                </div>
                {Object.entries(PLATFORM_LAYOUTS).map(([platform, label]) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={layoutGuide.platform === platform}
                      onCheckedChange={() =>
                        toggleLayoutGuide(platform as PlatformLayout)
                      }
                    />
                    <Label htmlFor={platform}>{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="text"
          size="icon"
          className="size-4!"
          onClick={onToggleExpanded}
          title="Enter fullscreen"
        >
          <Expand className="size-4!" />
        </Button>
      </div>
    </div>
  );
}
