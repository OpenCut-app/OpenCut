import { Button } from "@/components/ui/button";
import { useTimelineStore } from "@/stores/timeline-store";
import type { MediaElement } from "@/types/timeline";
import {
  PropertyGroup,
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";

interface MediaPropertiesProps {
  element: MediaElement;
  trackId: string;
}

// Renders flip controls for a media element so users can mirror footage.
export function MediaProperties({ element, trackId }: MediaPropertiesProps) {
  const toggleMediaFlip = useTimelineStore((state) => state.toggleMediaFlip);
  const flipHorizontal = !!element.transform?.flipHorizontal;
  const flipVertical = !!element.transform?.flipVertical;

  return (
    <div className="space-y-4 p-5">
      <PropertyGroup title="Flip">
        <PropertyItemValue>
          <div className="flex gap-2">
            <Button
              variant={flipHorizontal ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMediaFlip(trackId, element.id, "horizontal")}
            >
              Flip Horizontal
            </Button>
            <Button
              variant={flipVertical ? "default" : "outline"}
              size="sm"
              onClick={() => toggleMediaFlip(trackId, element.id, "vertical")}
            >
              Flip Vertical
            </Button>
          </div>
        </PropertyItemValue>
      </PropertyGroup>
    </div>
  );
}
