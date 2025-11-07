import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { useTimelineStore } from "@/stores/timeline-store";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";

export function TextView() {
  return (
    <BaseView>
      <DraggableMediaItem
        name="Default text"
        preview={
          <div className="flex items-center justify-center w-full h-full bg-panel-accent rounded">
            <span className="text-xs select-none">Default text</span>
          </div>
        }
        dragData={{
          id: "temp-text-id",
          type: DEFAULT_TEXT_ELEMENT.type,
          name: DEFAULT_TEXT_ELEMENT.name,
          content: DEFAULT_TEXT_ELEMENT.content,
        }}
        aspectRatio={1}
        onAddToTimeline={(currentTime) =>
          useTimelineStore.getState().addElementAtTime(
            {
              ...DEFAULT_TEXT_ELEMENT,
              id: "temp-text-id",
            },
            currentTime
          )
        }
        showLabel={false}
      />
    </BaseView>
  );
}
