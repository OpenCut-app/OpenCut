"use client";

import { cn } from "@/lib/utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

interface TimelineMarkerProps {
  time: number;
  zoomLevel: number;
  interval: number;
  isMainMarker: boolean;
}

/**
 * Renders a timeline marker positioned horizontally and labeled with a formatted time.
 *
 * The marker's horizontal position is derived from `time`, a pixels-per-second constant, and `zoomLevel`.
 *
 * @param time - Marker time in seconds used for positioning and label formatting
 * @param zoomLevel - Horizontal scaling factor applied to the marker position
 * @param interval - Threshold that controls label precision: if `interval >= 1` whole seconds are shown; otherwise one decimal place is used for sub-second precision
 * @param isMainMarker - When true, applies emphasis styling to the marker and its label
 * @returns The marker element to render in the timeline
 */
export function TimelineMarker({
  time,
  zoomLevel,
  interval,
  isMainMarker,
}: TimelineMarkerProps) {
  return (
    <div
      className={cn(
        "absolute top-0 h-4",
        isMainMarker
          ? "border-l border-muted-foreground/40"
          : "border-l border-muted-foreground/20"
      )}
      style={{
        left: `${time * TIMELINE_CONSTANTS.PIXELS_PER_SECOND * zoomLevel}px`,
      }}
    >
      <span
        className={cn(
          "absolute top-1 left-1 text-[0.6rem]",
          isMainMarker
            ? "text-muted-foreground font-medium"
            : "text-muted-foreground/70"
        )}
      >
        {(() => {
          const formatTime = (seconds: number) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
              return `${hours}:${minutes
                .toString()
                .padStart(2, "0")}:${Math.floor(secs)
                .toString()
                .padStart(2, "0")}`;
            }
            if (minutes > 0) {
              return `${minutes}:${Math.floor(secs)
                .toString()
                .padStart(2, "0")}`;
            }
            if (interval >= 1) {
              return `${Math.floor(secs)}s`;
            }
            return `${secs.toFixed(1)}s`;
          };
          return formatTime(time);
        })()}
      </span>
    </div>
  );
}