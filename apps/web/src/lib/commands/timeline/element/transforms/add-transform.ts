import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isTransformableElement, updateElementInTracks } from "@/lib/timeline";
import type { TimelineTrack, TransformableElement } from "@/lib/timeline";
import { buildDefaultTransformInstance } from "@/lib/transforms";

function addTransformToElement({
	element,
	transformType,
}: {
	element: TransformableElement;
	transformType: string;
}): TransformableElement {
	const instance = buildDefaultTransformInstance({ transformType });
	const currentTransforms = element.clipTransforms ?? [];
	return { ...element, clipTransforms: [...currentTransforms, instance] };
}

export class AddClipTransformCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private transformId: string | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly transformType: string;

	constructor({
		trackId,
		elementId,
		transformType,
	}: {
		trackId: string;
		elementId: string;
		transformType: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.transformType = transformType;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		const updatedTracks = updateElementInTracks({
			tracks: this.savedState,
			trackId: this.trackId,
			elementId: this.elementId,
			elementPredicate: isTransformableElement,
			update: (element) => {
				const updated = addTransformToElement({
					element: element as TransformableElement,
					transformType: this.transformType,
				});
				const transforms = updated.clipTransforms ?? [];
				this.transformId = transforms[transforms.length - 1]?.id ?? null;
				return updated;
			},
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getTransformId(): string | null {
		return this.transformId;
	}
}
