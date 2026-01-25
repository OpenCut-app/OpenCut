"use client";

import { useTimelineStore } from "@/stores/timeline-store";
import { TimelineElement, TimelineTrack } from "@/types/timeline";
import { useMediaStore } from "@/stores/media-store";
import { MediaFile } from "@/types/media";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Play, Pause, Expand, SkipBack, SkipForward } from "lucide-react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type RefObject,
} from "react";
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

interface WebAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
  webkitOfflineAudioContext?: typeof OfflineAudioContext;
}

interface IdleDeadline {
  timeRemaining: () => number;
  didTimeout: boolean;
}

interface WindowWithIdleCallback extends Window {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export function PreviewPanel() {
  const { tracks, getTotalDuration, updateTextElement } = useTimelineStore();
  const { mediaFiles } = useMediaStore();
  const { currentTime, setCurrentTime } = usePlaybackStore();
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
  const preRenderAbortRef = useRef<AbortController | null>(null);
  const isPlayingRef = useRef(false);
  const drawLatestRef = useRef<(() => Promise<void>) | null>(null);
  const renderInFlightRef = useRef(false);
  const renderQueuedRef = useRef(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const audioBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const audioDecodePromisesRef = useRef<
    Map<string, Promise<AudioBuffer | null>>
  >(new Map());
  const audioDecodeFailuresRef = useRef<Set<string>>(new Set());
  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const audioScheduleSeqRef = useRef(0);
  const playRequestSeqRef = useRef(0);
  const offlineAudioContextRef = useRef<OfflineAudioContext | null>(null);
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

  const ensureAudioContextRunning = useCallback(() => {
    const win = window as WebAudioWindow;
    const Ctx = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctx) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new Ctx();
    }

    if (!audioGainRef.current) {
      audioGainRef.current = audioContextRef.current.createGain();
      audioGainRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
  }, []);

  const getDecodeContext = useCallback((): BaseAudioContext | null => {
    if (offlineAudioContextRef.current) return offlineAudioContextRef.current;

    const win = window as WebAudioWindow;
    const OfflineCtx = win.OfflineAudioContext ?? win.webkitOfflineAudioContext;
    if (OfflineCtx) {
      offlineAudioContextRef.current = new OfflineCtx(2, 1, 48_000);
      return offlineAudioContextRef.current;
    }

    return audioContextRef.current;
  }, []);

  const ensureAudioBuffer = useCallback(
    async (mediaItem: MediaFile): Promise<AudioBuffer | null> => {
      const cached = audioBuffersRef.current.get(mediaItem.id);
      if (cached) return cached;
      if (audioDecodeFailuresRef.current.has(mediaItem.id)) return null;

      const existing = audioDecodePromisesRef.current.get(mediaItem.id);
      if (existing) return existing;

      const decodeContext = getDecodeContext();
      if (!decodeContext) return null;

      const promise = (async () => {
        try {
          const arr = await mediaItem.file.arrayBuffer();
          const buf = await decodeContext.decodeAudioData(arr.slice(0));
          audioBuffersRef.current.set(mediaItem.id, buf);
          return buf;
        } catch (error) {
          audioDecodeFailuresRef.current.add(mediaItem.id);
          console.warn(`Failed to decode audio for ${mediaItem.name}:`, error);
          return null;
        } finally {
          audioDecodePromisesRef.current.delete(mediaItem.id);
        }
      })();

      audioDecodePromisesRef.current.set(mediaItem.id, promise);
      return promise;
    },
    [getDecodeContext]
  );

  const toggleWithAudio = useCallback(() => {
    ensureAudioContextRunning();
    const playback = usePlaybackStore.getState();
    if (playback.isPlaying) {
      playback.pause();
      return;
    }

    const requestSeq = playRequestSeqRef.current + 1;
    playRequestSeqRef.current = requestSeq;

    const warmup = async () => {
      const playbackNow = usePlaybackStore.getState().currentTime;
      const tracksSnapshot = useTimelineStore.getState().tracks;
      const mediaList = useMediaStore.getState().mediaFiles;
      const idToMedia = new Map(mediaList.map((m) => [m.id, m] as const));

      const warmupIds = new Set<string>();
      for (const track of tracksSnapshot) {
        for (const element of track.elements) {
          if (element.type !== "media") continue;
          const media = idToMedia.get(element.mediaId);
          if (!media || (media.type !== "audio" && media.type !== "video"))
            continue;
          const visibleDuration =
            element.duration - element.trimStart - element.trimEnd;
          if (visibleDuration <= 0) continue;
          const elementEnd = element.startTime + visibleDuration;
          if (elementEnd <= playbackNow) continue;
          if (element.startTime > playbackNow + 0.1) continue;
          warmupIds.add(media.id);
        }
      }

      const warmups: Array<Promise<AudioBuffer | null>> = [];
      for (const id of warmupIds) {
        const media = idToMedia.get(id);
        if (!media) continue;
        warmups.push(ensureAudioBuffer(media));
      }
      await Promise.all(warmups);

      if (requestSeq !== playRequestSeqRef.current) return;
      usePlaybackStore.getState().play();
    };

    warmup().catch(() => {
      usePlaybackStore.getState().play();
    });
  }, [ensureAudioContextRunning, ensureAudioBuffer]);

  const requestDraw = useCallback(() => {
    renderQueuedRef.current = true;
    if (renderInFlightRef.current) return;
    renderInFlightRef.current = true;

    const run = async () => {
      try {
        while (renderQueuedRef.current) {
          renderQueuedRef.current = false;
          const draw = drawLatestRef.current;
          if (!draw) return;
          await draw();
        }
      } finally {
        renderInFlightRef.current = false;
      }
    };

    run().catch((error) => {
      console.warn("Preview render loop failed:", error);
    });
  }, []);

  useEffect(() => {
    const handleUserGesture = () => {
      ensureAudioContextRunning();
    };

    window.addEventListener("pointerdown", handleUserGesture);
    window.addEventListener("keydown", handleUserGesture);
    return () => {
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
    };
  }, [ensureAudioContextRunning]);

  useEffect(() => {
    const mediaIds = new Set(mediaFiles.map((mediaFile) => mediaFile.id));
    for (const cachedId of audioBuffersRef.current.keys()) {
      if (!mediaIds.has(cachedId)) {
        audioBuffersRef.current.delete(cachedId);
      }
    }
    for (const cachedId of audioDecodePromisesRef.current.keys()) {
      if (!mediaIds.has(cachedId)) {
        audioDecodePromisesRef.current.delete(cachedId);
      }
    }
    for (const cachedId of audioDecodeFailuresRef.current) {
      if (!mediaIds.has(cachedId)) {
        audioDecodeFailuresRef.current.delete(cachedId);
      }
    }
  }, [mediaFiles]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      preRenderAbortRef.current?.abort();
      preRenderAbortRef.current = null;
    }
  }, [isPlaying]);

  useEffect(() => {
    const win = window as WindowWithIdleCallback;

    const decodeUsedMedia = () => {
      const idToMedia = new Map(mediaFiles.map((m) => [m.id, m] as const));
      const usedIds = new Set<string>();
      for (const track of tracks) {
        for (const element of track.elements) {
          if (element.type !== "media") continue;
          const media = idToMedia.get(element.mediaId);
          if (!media || (media.type !== "audio" && media.type !== "video"))
            continue;
          usedIds.add(media.id);
        }
      }

      for (const id of usedIds) {
        const media = idToMedia.get(id);
        if (!media) continue;
        if (audioBuffersRef.current.has(id)) continue;
        if (audioDecodeFailuresRef.current.has(id)) continue;
        if (audioDecodePromisesRef.current.has(id)) continue;
        ensureAudioBuffer(media).catch(() => {});
      }
    };

    if (typeof win.requestIdleCallback === "function") {
      const handle = win.requestIdleCallback(() => decodeUsedMedia(), {
        timeout: 1000,
      });
      return () => {
        win.cancelIdleCallback?.(handle);
      };
    }

    const timeout = window.setTimeout(() => decodeUsedMedia(), 0);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [tracks, mediaFiles, ensureAudioBuffer]);

  // Web Audio: schedule only on play/pause/seek/volume/mute changes
  useEffect(() => {
    const ensureAudioGraph = async (): Promise<{
      audioCtx: AudioContext;
      gain: GainNode;
    } | null> => {
      const audioCtx = audioContextRef.current;
      if (!audioCtx) return null;
      if (!audioGainRef.current) {
        audioGainRef.current = audioCtx.createGain();
        audioGainRef.current.connect(audioCtx.destination);
      }
      const gainValue = muted ? 0 : Math.max(0, Math.min(1, volume));
      audioGainRef.current.gain.setValueAtTime(gainValue, audioCtx.currentTime);
      return { audioCtx, gain: audioGainRef.current };
    };

    const scheduleNow = async () => {
      const scheduleSeq = audioScheduleSeqRef.current + 1;
      audioScheduleSeqRef.current = scheduleSeq;

      const graph = await ensureAudioGraph();
      if (!graph) return;
      const { audioCtx, gain } = graph;

      const tracksSnapshot = tracks;
      const mediaList = mediaFiles;
      const idToMedia = new Map(mediaList.map((m) => [m.id, m] as const));
      const playbackNow = usePlaybackStore.getState().currentTime;

      const audible: Array<{
        id: string;
        startDelay: number;
        localTime: number;
        playDuration: number;
        muted: boolean;
        trackMuted: boolean;
      }> = [];
      for (const track of tracksSnapshot) {
        for (const element of track.elements) {
          if (element.type !== "media") continue;
          const media = idToMedia.get(element.mediaId);
          if (!media || (media.type !== "audio" && media.type !== "video"))
            continue;
          const visibleDuration =
            element.duration - element.trimStart - element.trimEnd;
          if (visibleDuration <= 0) continue;
          const elementEnd = element.startTime + visibleDuration;
          if (elementEnd <= playbackNow) continue;

          const startDelay = Math.max(0, element.startTime - playbackNow);
          const offsetIntoClip = Math.max(0, playbackNow - element.startTime);
          const localTime = element.trimStart + offsetIntoClip;
          const playDuration = Math.max(0, visibleDuration - offsetIntoClip);
          if (playDuration <= 0) continue;
          audible.push({
            id: media.id,
            startDelay,
            localTime,
            playDuration,
            muted: !!element.muted,
            trackMuted: !!track.muted,
          });
        }
      }

      if (audible.length === 0) return;

      const startAt = audioCtx.currentTime + 0.02;
      const scheduleEntry = async (entry: (typeof audible)[number]) => {
        if (entry.muted || entry.trackMuted) return;
        const mediaItem = idToMedia.get(entry.id);
        if (!mediaItem) return;
        const buffer = await ensureAudioBuffer(mediaItem);
        if (scheduleSeq !== audioScheduleSeqRef.current) return;
        if (!buffer) return;
        if (entry.playDuration <= 0) return;

        let startTime = startAt + entry.startDelay;
        let offset = entry.localTime;
        let playDuration = entry.playDuration;

        const now = audioCtx.currentTime;
        if (startTime < now) {
          const lateBy = now - startTime;
          offset += lateBy;
          playDuration = Math.max(0, playDuration - lateBy);
          startTime = now + 0.02;
        }

        if (offset >= buffer.duration) return;
        const remainingInBuffer = Math.max(0, buffer.duration - offset);
        const clampedDuration = Math.min(playDuration, remainingInBuffer);
        if (clampedDuration <= 0) return;

        const src = audioCtx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        try {
          src.start(startTime, offset, clampedDuration);
          playingSourcesRef.current.add(src);
        } catch {}
      };

      for (const entry of audible) {
        scheduleEntry(entry).catch(() => {});
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
      scheduleNow().catch(() => {});
    };

    // Apply volume/mute changes immediately
    ensureAudioGraph().catch(() => {});

    // Start/stop on play state changes
    for (const src of playingSourcesRef.current) {
      try {
        src.stop();
      } catch {}
    }
    playingSourcesRef.current.clear();
    if (isPlaying) {
      scheduleNow().catch(() => {});
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
  }, [isPlaying, volume, muted, tracks, mediaFiles, ensureAudioBuffer]);

  // Canvas: draw current frame with caching
  useEffect(() => {
    const draw = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const mainCtx = canvas.getContext("2d", { alpha: false });
        if (!mainCtx) return;

        const devicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
        const cssWidth = Math.max(1, Math.floor(previewDimensions.width));
        const cssHeight = Math.max(1, Math.floor(previewDimensions.height));
        const renderWidth = Math.max(
          1,
          Math.floor(cssWidth * devicePixelRatio)
        );
        const renderHeight = Math.max(
          1,
          Math.floor(cssHeight * devicePixelRatio)
        );

        if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
          canvas.width = renderWidth;
          canvas.height = renderHeight;
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

        const renderSize = { width: renderWidth, height: renderHeight };

        if (!isPlaying) {
          const cachedFrame = getCachedFrame(
            currentTime,
            tracks,
            mediaFiles,
            activeProject,
            currentScene?.id,
            renderSize
          );

          if (cachedFrame) {
            renderSeqRef.current += 1;
            mainCtx.setTransform(1, 0, 0, 1, 0, 0);
            mainCtx.clearRect(0, 0, renderWidth, renderHeight);
            mainCtx.drawImage(cachedFrame, 0, 0);

            preRenderAbortRef.current?.abort();
            preRenderAbortRef.current = new AbortController();
            const abortSignal = preRenderAbortRef.current.signal;
            const preRenderSeq = renderSeqRef.current;

            preRenderNearbyFrames(
              currentTime,
              tracks,
              mediaFiles,
              activeProject,
              async (time: number) => {
                if (abortSignal.aborted)
                  throw new Error("Pre-render cancelled");
                if (isPlayingRef.current)
                  throw new Error("Pre-render interrupted by playback");
                if (preRenderSeq !== renderSeqRef.current)
                  throw new Error("Pre-render stale");

                const tempCanvas = document.createElement("canvas");
                tempCanvas.width = renderWidth;
                tempCanvas.height = renderHeight;
                const tempCtx = tempCanvas.getContext("2d", { alpha: false });
                if (!tempCtx)
                  throw new Error("Failed to create temp canvas context");

                await renderTimelineFrame({
                  ctx: tempCtx,
                  time,
                  canvasWidth: renderWidth,
                  canvasHeight: renderHeight,
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

                if (abortSignal.aborted)
                  throw new Error("Pre-render cancelled");

                return await createImageBitmap(tempCanvas);
              },
              currentScene?.id,
              2,
              renderSize,
              abortSignal
            );

            return;
          }
        }

        const renderSeq = renderSeqRef.current + 1;
        renderSeqRef.current = renderSeq;
        preRenderAbortRef.current?.abort();
        preRenderAbortRef.current = null;

        // Cache miss - render from scratch
        if (!offscreenCanvasRef.current) {
          const hasOffscreen =
            typeof (globalThis as unknown as { OffscreenCanvas?: unknown })
              .OffscreenCanvas !== "undefined";
          if (hasOffscreen) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            offscreenCanvasRef.current = new (
              globalThis as any
            ).OffscreenCanvas(renderWidth, renderHeight) as OffscreenCanvas;
          } else {
            const c = document.createElement("canvas");
            c.width = renderWidth;
            c.height = renderHeight;
            offscreenCanvasRef.current = c;
          }
        }

        // Ensure size matches
        if (
          offscreenCanvasRef.current &&
          (offscreenCanvasRef.current as HTMLCanvasElement).getContext
        ) {
          const c = offscreenCanvasRef.current as HTMLCanvasElement;
          if (c.width !== renderWidth || c.height !== renderHeight) {
            c.width = renderWidth;
            c.height = renderHeight;
          }
        } else {
          const c = offscreenCanvasRef.current as OffscreenCanvas;
          // @ts-expect-error width/height exist on OffscreenCanvas in modern browsers
          if (
            (c as unknown as { width: number }).width !== renderWidth ||
            (c as unknown as { height: number }).height !== renderHeight
          ) {
            // @ts-expect-error
            (c as unknown as { width: number }).width = renderWidth;
            // @ts-expect-error
            (c as unknown as { height: number }).height = renderHeight;
          }
        }

        const offscreenCanvas = offscreenCanvasRef.current as
          | HTMLCanvasElement
          | OffscreenCanvas;
        const offCtx = (offscreenCanvas as HTMLCanvasElement).getContext
          ? (offscreenCanvas as HTMLCanvasElement).getContext("2d", {
              alpha: false,
            })
          : (offscreenCanvas as OffscreenCanvas).getContext("2d", {
              alpha: false,
            });
        if (!offCtx) return;

        await renderTimelineFrame({
          ctx: offCtx as CanvasRenderingContext2D,
          time: currentTime,
          canvasWidth: renderWidth,
          canvasHeight: renderHeight,
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

        if (renderSeq !== renderSeqRef.current) return;

        // Blit offscreen to visible canvas
        mainCtx.setTransform(1, 0, 0, 1, 0, 0);
        mainCtx.clearRect(0, 0, renderWidth, renderHeight);
        if ((offscreenCanvas as HTMLCanvasElement).getContext) {
          mainCtx.drawImage(offscreenCanvas as HTMLCanvasElement, 0, 0);
        } else {
          mainCtx.drawImage(
            offscreenCanvas as unknown as CanvasImageSource,
            0,
            0
          );
        }

        if (!isPlaying) {
          const bitmap = await createImageBitmap(
            offscreenCanvas as unknown as ImageBitmapSource
          );
          if (renderSeq !== renderSeqRef.current) {
            try {
              bitmap.close();
            } catch {}
            return;
          }

          cacheFrame(
            currentTime,
            bitmap,
            tracks,
            mediaFiles,
            activeProject,
            currentScene?.id,
            renderSize
          );
        }
      } catch (error) {
        console.warn("Failed to render preview frame:", error);
      }
    };

    drawLatestRef.current = draw;
    requestDraw();
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
    requestDraw,
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
              {isExpanded ? null : (
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
              )}
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
            toggle={toggleWithAudio}
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
          canvasRef={canvasRef}
          hasAnyElements={hasAnyElements}
          toggleExpanded={toggleExpanded}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          toggle={toggleWithAudio}
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
  const lastDragTimeRef = useRef(0);

  const totalDuration = getTotalDuration();
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAnyElements) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * totalDuration;
    seek(Math.max(0, Math.min(newTime, totalDuration)));
  };

  const handleTimelineDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasAnyElements) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);
    lastDragTimeRef.current = currentTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const dragX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, dragX / rect.width));
      const newTime = percentage * totalDuration;
      const clampedTime = Math.max(0, Math.min(newTime, totalDuration));
      lastDragTimeRef.current = clampedTime;
      setCurrentTime(clampedTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      seek(lastDragTimeRef.current);
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
    seek(newTime);
  };

  const skipForward = () => {
    const newTime = Math.min(totalDuration, currentTime + 1);
    seek(newTime);
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
  canvasRef,
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
  canvasRef: RefObject<HTMLCanvasElement | null>;
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
