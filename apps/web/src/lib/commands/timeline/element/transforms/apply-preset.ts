import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isTransformableElement, updateElementInTracks } from "@/lib/timeline";
import type { TimelineTrack, TransformableElement } from "@/lib/timeline";
import { applyPresetToElement } from "./apply-preset-to-element";

export class ApplyTransformPresetCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private transformIds: string[] = [];
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly presetType: string;

	constructor({
		trackId,
		elementId,
		presetType,
	}: {
		trackId: string;
		elementId: string;
		presetType: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.presetType = presetType;
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
				const result = applyPresetToElement({
					element: element as TransformableElement,
					presetType: this.presetType,
				});
				this.transformIds = result.transformIds;
				return result.element;
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

	getTransformIds(): string[] {
		return this.transformIds;
	}
}
