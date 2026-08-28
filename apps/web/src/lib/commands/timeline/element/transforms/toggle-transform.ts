import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isTransformableElement, updateElementInTracks } from "@/lib/timeline";
import type { TimelineTrack, TransformableElement } from "@/lib/timeline";

export function toggleTransformOnElement({
	element,
	transformId,
}: {
	element: TransformableElement;
	transformId: string;
}): TransformableElement {
	const currentTransforms = element.clipTransforms ?? [];
	const updated = currentTransforms.map((transform) =>
		transform.id === transformId
			? { ...transform, enabled: !transform.enabled }
			: transform,
	);
	return { ...element, clipTransforms: updated };
}

export class ToggleClipTransformCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly transformId: string;

	constructor({
		trackId,
		elementId,
		transformId,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.transformId = transformId;
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
				toggleTransformOnElement({
					element: element as TransformableElement,
					transformId: this.transformId,
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
