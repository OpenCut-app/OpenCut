import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-view";
import { useEditor } from "@/hooks/use-editor";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { buildTextElement } from "@/lib/timeline/element-utils";

export function TextView() {
	const editor = useEditor();

	const handleAddToTimeline = ({ currentTime }: { currentTime: number }) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: DEFAULT_TEXT_ELEMENT,
			startTime: currentTime,
		});

		editor.timeline.insertElement({
			element,
			placement: { mode: "auto" },
		});
	};

	return (
		<PanelView title="Text">
			<DraggableItem
				name="Default text"
				preview={
					<div className="bg-accent flex size-full items-center justify-center rounded">
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
				onAddToTimeline={handleAddToTimeline}
				shouldShowLabel={false}
			/>
		</PanelView>
	);
}
