"use client";

import { cn } from "@/lib/utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import { TimelineTrack } from "@/types/timeline";
import { MediaFile } from "@/types/media";
import { TProject } from "@/types/project";
import { useSceneStore } from "@/stores/scene-store";

interface CacheSegment {
  startTime: number;
  endTime: number;
  cached: boolean;
}

interface TimelineCacheIndicatorProps {
  duration: number;
  zoomLevel: number;
  tracks: TimelineTrack[];
  mediaFiles: MediaFile[];
  activeProject: TProject | null;
  getRenderStatus: (
    time: number,
    tracks: TimelineTrack[],
    mediaFiles: MediaFile[],
    activeProject: TProject | null,
    sceneId?: string
  ) => "cached" | "not-cached";
}

export function TimelineCacheIndicator({
  duration,
  zoomLevel,
  tracks,
  mediaFiles,
  activeProject,
  getRenderStatus,
}: TimelineCacheIndicatorProps) {
  const { currentScene } = useSceneStore();

  // Calculate cache segments by sampling the timeline
  const calculateCacheSegments = (): CacheSegment[] => {
    const segments: CacheSegment[] = [];
    const sampleRate = 10; // Sample every 0.1 seconds
    const totalSamples = Math.ceil(duration * sampleRate);

    if (totalSamples === 0) {
      return [{ startTime: 0, endTime: duration, cached: false }];
    }

    let currentSegment: CacheSegment | null = null;

    for (let i = 0; i <= totalSamples; i++) {
      const time = i / sampleRate;
      const cached =
        getRenderStatus(
          time,
          tracks,
          mediaFiles,
          activeProject,
          currentScene?.id
        ) === "cached";

      if (!currentSegment) {
        // Start first segment
        currentSegment = {
          startTime: time,
          endTime: time,
          cached,
        };
      } else if (currentSegment.cached === cached) {
        // Extend current segment
        currentSegment.endTime = time;
      } else {
        // Finish current segment and start new one
        segments.push(currentSegment);
        currentSegment = {
          startTime: time,
          endTime: time,
          cached,
        };
      }
    }

    // Add the last segment
    if (currentSegment) {
      currentSegment.endTime = duration;
      segments.push(currentSegment);
    }

    return segments;
  };

  const cacheSegments = calculateCacheSegments();

  return (
    <div className="absolute top-0 left-0 right-0 h-px z-10 pointer-events-none">
      {cacheSegments.map((segment, index) => {
        const startX =
          segment.startTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        const endX =
          segment.endTime * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel;
        const width = endX - startX;

        return (
          <div
            key={index}
            className={cn(
              "absolute top-0 h-px",
              segment.cached ? "bg-primary" : "bg-transparent"
            )}
            style={{
              left: `${startX}px`,
              width: `${width}px`,
            }}
            title={
              segment.cached
                ? "Cached (fast playback)"
                : "Not cached (will render)"
            }
          />
        );
      })}
    </div>
  );
}
