import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import { isTransformableElement, updateElementInTracks } from "@/lib/timeline";
import type { ParamValues } from "@/lib/params";
import type { TimelineTrack, TransformableElement } from "@/lib/timeline";

function updateTransformParamsOnElement({
	element,
	transformId,
	params,
}: {
	element: TransformableElement;
	transformId: string;
	params: Partial<ParamValues>;
}): TransformableElement {
	const currentTransforms = element.clipTransforms ?? [];
	const updated = currentTransforms.map((transform) => {
		if (transform.id !== transformId) {
			return transform;
		}

		const nextParams = { ...transform.params };
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				nextParams[key] = value;
			}
		}

		return { ...transform, params: nextParams };
	});
	return { ...element, clipTransforms: updated };
}

export class UpdateClipTransformParamsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private readonly trackId: string;
	private readonly elementId: string;
	private readonly transformId: string;
	private readonly params: Partial<ParamValues>;

	constructor({
		trackId,
		elementId,
		transformId,
		params,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
		params: Partial<ParamValues>;
	}) {
		super();
		this.trackId = trackId;
		this.elementId = elementId;
		this.transformId = transformId;
		this.params = params;
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
				updateTransformParamsOnElement({
					element: element as TransformableElement,
					transformId: this.transformId,
					params: this.params,
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
