"use client";

import { useMediaStore } from "@/stores/media-store";
import { useTimelineStore } from "@/stores/timeline-store";
import type { TextElement } from "@/types/timeline";
import { ScrollArea } from "../../ui/scroll-area";
import { AudioProperties } from "./audio-properties";
import { MediaProperties } from "./media-properties";
import { TextProperties } from "./text-properties";
import { SquareSlashIcon } from "lucide-react";

interface TextSelectionTarget {
  trackId: string;
  elementId: string;
}

export function PropertiesPanel() {
  const { selectedElements, tracks } = useTimelineStore();
  const { mediaFiles } = useMediaStore();

  const isTranscriptElement = (element: TextElement): boolean => {
    return element.name.toLowerCase().startsWith("caption ");
  };

  return (
    <>
      {selectedElements.length > 0 ? (
        <ScrollArea className="h-full bg-panel rounded-sm">
          {(() => {
            const transcriptTargets: TextSelectionTarget[] = [];
            const transcriptElements: TextElement[] = [];
            const textTargets: TextSelectionTarget[] = [];
            const textElements: TextElement[] = [];
            const nonTextSelections: Array<{
              trackId: string;
              elementId: string;
            }> = [];

            for (const { trackId, elementId } of selectedElements) {
              const track = tracks.find((t) => t.id === trackId);
              const element = track?.elements.find((e) => e.id === elementId);
              if (!element) continue;

              if (element.type === "text") {
                const target = { trackId, elementId };
                if (isTranscriptElement(element)) {
                  transcriptTargets.push(target);
                  transcriptElements.push(element);
                } else {
                  textTargets.push(target);
                  textElements.push(element);
                }
                continue;
              }

              nonTextSelections.push({ trackId, elementId });
            }

            const transcriptKey =
              transcriptTargets.length > 0
                ? `transcript-${transcriptTargets
                    .map((t) => `${t.trackId}:${t.elementId}`)
                    .join("|")}`
                : null;
            const textKey =
              textTargets.length > 0
                ? `text-${textTargets
                    .map((t) => `${t.trackId}:${t.elementId}`)
                    .join("|")}`
                : null;

            return (
              <>
                {transcriptElements.length > 0 ? (
                  <div key={transcriptKey ?? "transcript"}>
                    <TextProperties
                      elements={transcriptElements}
                      targets={transcriptTargets}
                      label="Transcript"
                    />
                  </div>
                ) : null}
                {textElements.length > 0 ? (
                  <div key={textKey ?? "text"}>
                    <TextProperties
                      elements={textElements}
                      targets={textTargets}
                      label={textTargets.length > 1 ? "Text" : undefined}
                    />
                  </div>
                ) : null}
                {nonTextSelections.map(({ trackId, elementId }) => {
                  const track = tracks.find((t) => t.id === trackId);
                  const element = track?.elements.find(
                    (e) => e.id === elementId
                  );

                  if (element?.type !== "media") return null;

                  const mediaFile = mediaFiles.find(
                    (file) => file.id === element.mediaId
                  );

                  if (mediaFile?.type === "audio") {
                    return (
                      <AudioProperties key={elementId} element={element} />
                    );
                  }

                  return (
                    <div key={elementId}>
                      <MediaProperties element={element} />
                    </div>
                  );
                })}
              </>
            );
          })()}
        </ScrollArea>
      ) : (
        <EmptyView />
      )}
    </>
  );
}

function EmptyView() {
  return (
    <div className="bg-panel h-full p-4 flex flex-col items-center justify-center gap-3">
      <SquareSlashIcon
        className="w-10 h-10 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-2 text-center">
        <p className="text-lg font-medium">It’s empty here</p>
        <p className="text-sm text-muted-foreground text-balance">
          Click an element on the timeline to edit its properties
        </p>
      </div>
    </div>
  );
}
