import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isTransformableElement, updateElementInTracks } from "@/lib/timeline";
import type { TimelineTrack, TransformableElement } from "@/lib/timeline";

function reorderTransformsOnElement({
	element,
	fromIndex,
	toIndex,
}: {
	element: TransformableElement;
	fromIndex: number;
	toIndex: number;
}): TransformableElement {
	const transforms = [...(element.clipTransforms ?? [])];
	const [moved] = transforms.splice(fromIndex, 1);
	transforms.splice(toIndex, 0, moved);
	return { ...element, clipTransforms: transforms };
}

export class ReorderClipTransformsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly fromIndex: number;
	private readonly toIndex: number;

	constructor({
		trackId,
		elementId,
		fromIndex,
		toIndex,
	}: {
		trackId: string;
		elementId: string;
		fromIndex: number;
		toIndex: number;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.fromIndex = fromIndex;
		this.toIndex = toIndex;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isTransformableElement,
			update: (element) =>
				reorderTransformsOnElement({
					element: element as TransformableElement,
					fromIndex: this.fromIndex,
					toIndex: this.toIndex,
				}),
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}
}
