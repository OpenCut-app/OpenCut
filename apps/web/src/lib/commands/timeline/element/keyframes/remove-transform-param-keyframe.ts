import { EditorCore } from "@/core";
import { Command } from "@/lib/commands/base-command";
import { removeTransformParamKeyframe } from "@/lib/animation/transform-param-channel";
import { updateElementInTracks } from "@/lib/timeline";
import { isTransformableElement } from "@/lib/timeline/element-utils";
import type { TimelineTrack } from "@/lib/timeline";

export class RemoveTransformParamKeyframeCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly transformId: string;
	private readonly paramKey: string;
	private readonly keyframeId: string;

	constructor({
		trackId,
		elementId,
		transformId,
		paramKey,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
		paramKey: string;
		keyframeId: string;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.transformId = transformId;
		this.paramKey = paramKey;
		this.keyframeId = keyframeId;
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
				const animations = removeTransformParamKeyframe({
					animations: element.animations,
					transformId: this.transformId,
					paramKey: this.paramKey,
					keyframeId: this.keyframeId,
				});
				return { ...element, animations };
			},
		});

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (!this.savedState) {
			return;
		}

		const editor = EditorCore.getInstance();
		editor.timeline.updateTracks(this.savedState);
	}
}
