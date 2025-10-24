import { MediaElement } from "@/types/timeline";
import { PanelBaseView } from "../panel-base-view";
import { Button } from "@/components/ui/button";
import { useTimelineStore } from "@/stores/timeline-store";
import { Sparkles, FlipHorizontal, FlipVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MediaProperties({
  element,
}: {
  element: MediaElement;
  trackId: string;
}) {
  const toggleSelectedMediaElements = useTimelineStore(
    (state) => state.toggleSelectedMediaElements
  );

  const toggleFlipH = () => {
    toggleSelectedMediaElements("flipH");
  };

  const toggleFlipV = () => {
    toggleSelectedMediaElements("flipV");
  };

  return (
    <PanelBaseView
      tabs={[
        {
          value: "transform",
          label: "Transform",
          icon: <Sparkles className="size-4" />,
          content: (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant={element.flipH ? "default" : "outline"}
                      onClick={toggleFlipH}
                      aria-pressed={element.flipH ?? false}
                      aria-label="Toggle horizontal mirror"
                    >
                      <FlipHorizontal className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Toggle horizontal mirror
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant={element.flipV ? "default" : "outline"}
                      onClick={toggleFlipV}
                      aria-pressed={element.flipV ?? false}
                      aria-label="Toggle vertical mirror"
                    >
                      <FlipVertical className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Toggle vertical mirror
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
