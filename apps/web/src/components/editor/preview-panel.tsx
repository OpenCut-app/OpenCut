"use client";

import {
  useTimelineStore,
  type TimelineClip,
  type TimelineTrack,
} from "@/stores/timeline-store";
import { useMediaStore, type MediaItem } from "@/stores/media-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEffectsStore } from "@/stores/effects-store";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Plus } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ActiveClip {
  clip: TimelineClip;
  track: TimelineTrack;
  mediaItem: MediaItem | null;
}

export function PreviewPanel() {
  const { tracks } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { currentTime, muted, toggleMute, volume } = usePlaybackStore();
  const { getClipEffects } = useEffectsStore();
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewDimensions, setPreviewDimensions] = useState({
    width: 0,
    height: 0,
  });

  // Calculate optimal preview size that fits in container while maintaining aspect ratio
  useEffect(() => {
    const updatePreviewSize = () => {
      if (!containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const computedStyle = getComputedStyle(containerRef.current);

      // Get padding values
      const paddingTop = parseFloat(computedStyle.paddingTop);
      const paddingBottom = parseFloat(computedStyle.paddingBottom);
      const paddingLeft = parseFloat(computedStyle.paddingLeft);
      const paddingRight = parseFloat(computedStyle.paddingRight);

      // Get gap value (gap-4 = 1rem = 16px)
      const gap = parseFloat(computedStyle.gap) || 16;

      // Get toolbar height if it exists
      const toolbar = containerRef.current.querySelector("[data-toolbar]");
      const toolbarHeight = toolbar
        ? toolbar.getBoundingClientRect().height
        : 0;

      // Calculate available space after accounting for padding, gap, and toolbar
      const availableWidth = container.width - paddingLeft - paddingRight;
      const availableHeight =
        container.height -
        paddingTop -
        paddingBottom -
        toolbarHeight -
        (toolbarHeight > 0 ? gap : 0);

      const targetRatio = canvasSize.width / canvasSize.height;
      const containerRatio = availableWidth / availableHeight;

      let width, height;

      if (containerRatio > targetRatio) {
        // Container is wider - constrain by height
        height = availableHeight;
        width = height * targetRatio;
      } else {
        // Container is taller - constrain by width
        width = availableWidth;
        height = width / targetRatio;
      }

      setPreviewDimensions({ width, height });
    };

    updatePreviewSize();

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [canvasSize.width, canvasSize.height]);

  // Get active clips at current time
  const getActiveClips = (): ActiveClip[] => {
    const activeClips: ActiveClip[] = [];

    tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipStart = clip.startTime;
        const clipEnd =
          clip.startTime + (clip.duration - clip.trimStart - clip.trimEnd);

        if (currentTime >= clipStart && currentTime < clipEnd) {
          const mediaItem =
            clip.mediaId === "test"
              ? null // Test clips don't have a real media item
              : mediaItems.find((item) => item.id === clip.mediaId) || null;

          activeClips.push({ clip, track, mediaItem });
        }
      });
    });

    return activeClips;
  };

  const activeClips = getActiveClips();

  // Render a clip
  const renderClip = (clipData: ActiveClip, index: number) => {
    const { clip, track, mediaItem } = clipData;

    const effects = getClipEffects(track.id, clip.id);
    
    const filterStyle = {
      filter: `blur(${effects.blur}px)`,
      opacity: effects.opacity / 100,
    };

    // Test clips
    if (!mediaItem || clip.mediaId === "test") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center"
          style={filterStyle}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🎬</div>
            <p className="text-xs text-white">{clip.name}</p>
          </div>
        </div>
      );
    }

    // Video clips
    if (mediaItem.type === "video") {
      return (
        <div key={clip.id} className="absolute inset-0" style={filterStyle}>
          <VideoPlayer
            src={mediaItem.url}
            poster={mediaItem.thumbnailUrl}
            clipStartTime={clip.startTime}
            trimStart={clip.trimStart}
            trimEnd={clip.trimEnd}
            clipDuration={clip.duration}
          />
        </div>
      );
    }

    // Image clips
    if (mediaItem.type === "image") {
      return (
        <div key={clip.id} className="absolute inset-0" style={filterStyle}>
          <img
            src={mediaItem.url}
            alt={mediaItem.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      );
    }

    // Audio clips (visual representation)
    if (mediaItem.type === "audio") {
      return (
        <div
          key={clip.id}
          className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center"
          style={filterStyle}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🎵</div>
            <p className="text-xs text-white">{mediaItem.name}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  // Canvas presets
  const canvasPresets = [
    { name: "16:9 HD", width: 1920, height: 1080 },
    { name: "16:9 4K", width: 3840, height: 2160 },
    { name: "9:16 Mobile", width: 1080, height: 1920 },
    { name: "1:1 Square", width: 1080, height: 1080 },
    { name: "4:3 Standard", width: 1440, height: 1080 },
  ];

  return (
    <div className="h-full w-full flex flex-col min-h-0 min-w-0">
      {/* Controls */}
      <div className="border-b p-2 flex items-center gap-2 text-xs flex-shrink-0">
        <span className="text-muted-foreground">Canvas:</span>
        <select
          value={`${canvasSize.width}x${canvasSize.height}`}
          onChange={(e) => {
            const preset = canvasPresets.find(
              (p) => `${p.width}x${p.height}` === e.target.value
            );
            if (preset)
              setCanvasSize({ width: preset.width, height: preset.height });
          }}
          className="bg-background border rounded px-2 py-1 text-xs"
        >
          {canvasPresets.map((preset) => (
            <option
              key={preset.name}
              value={`${preset.width}x${preset.height}`}
            >
              {preset.name} ({preset.width}×{preset.height})
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleMute}
          className="ml-auto"
        >
          {muted || volume === 0 ? (
            <VolumeX className="h-3 w-3 mr-1" />
          ) : (
            <Volume2 className="h-3 w-3 mr-1" />
          )}
          {muted || volume === 0 ? "Unmute" : "Mute"}
        </Button>
      </div>

      {/* Preview Area */}
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center p-3 min-h-0 min-w-0 gap-4"
      >
        <div
          ref={previewRef}
          className="relative overflow-hidden rounded-sm bg-black border"
          style={{
            width: previewDimensions.width,
            height: previewDimensions.height,
          }}
        >
          {activeClips.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {tracks.length === 0
                ? "No media added to timeline"
                : "No clips at current time"}
            </div>
          ) : (
            activeClips.map((clipData, index) => renderClip(clipData, index))
          )}
        </div>

        <PreviewToolbar />
      </div>
    </div>
  );
}

function PreviewToolbar() {
  const { isPlaying, toggle } = usePlaybackStore();

  return (
    <div
      data-toolbar
      className="flex items-center justify-center gap-2 px-4 pt-2 bg-background-500 w-full"
    >
      <Button variant="text" size="icon" onClick={toggle}>
        {isPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
