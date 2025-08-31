"use client";

import { useEffectsStore } from "@/stores/effects-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EffectsTimelineProps {
  trackId: string;
  elementId: string;
}

export function EffectsTimeline({ trackId, elementId }: EffectsTimelineProps) {
  const { getEffectsForElement } = useEffectsStore();
  const { tracks } = useTimelineStore();

  const track = tracks.find((t) => t.id === trackId);
  const element = track?.elements.find((e) => e.id === elementId);
  const effects = getEffectsForElement(elementId);

  if (!element || effects.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none">
      {effects.map((effect) => {
        if (!effect.enabled) return null;

        const effectStart = Math.max(0, effect.startTime - element.startTime);
        const effectEnd = Math.min(
          element.duration,
          effect.endTime - element.startTime
        );
        const effectDuration = effectEnd - effectStart;

        if (effectDuration <= 0) return null;

        const left = (effectStart / element.duration) * 100;
        const width = (effectDuration / element.duration) * 100;

        return (
          <Tooltip key={effect.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "absolute top-0 h-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-sm",
                  "flex items-center justify-center cursor-pointer pointer-events-auto"
                )}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Select effect for editing
                }}
              >
                <Sparkles className="h-2 w-2 text-purple-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">{effect.name}</p>
                <p className="text-xs text-muted-foreground">
                  {effect.startTime.toFixed(1)}s - {effect.endTime.toFixed(1)}s
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
