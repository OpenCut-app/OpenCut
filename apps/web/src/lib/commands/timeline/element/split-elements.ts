import { Command } from "@/lib/commands/base-command";
import type { TimelineTrack } from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import { EditorCore } from "@/core";

export class SplitElementsCommand extends Command {
	private savedState: TimelineTrack[] | null = null;
	private rightSideElements: { trackId: string; elementId: string }[] = [];
	private previousSelection: { trackId: string; elementId: string }[] = [];

	constructor(
		private elements: { trackId: string; elementId: string }[],
		private splitTime: number,
		private retainSide: "both" | "left" | "right" = "both",
	) {
		super();
	}

	getRightSideElements(): { trackId: string; elementId: string }[] {
		return this.rightSideElements;
	}

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();
		this.previousSelection = editor.selection.getSelectedElements();
		this.rightSideElements = [];

		const updatedTracks = this.savedState.map((track) => {
			const elementsToSplit = this.elements.filter(
				(el) => el.trackId === track.id,
			);

			if (elementsToSplit.length === 0) {
				return track;
			}

			return {
				...track,
				elements: track.elements.flatMap((element) => {
					const shouldSplit = elementsToSplit.some(
						(el) => el.elementId === element.id,
					);

					if (!shouldSplit) {
						return [element];
					}

					const effectiveStart = element.startTime;
					const effectiveEnd = element.startTime + element.duration;

					if (
						this.splitTime <= effectiveStart ||
						this.splitTime >= effectiveEnd
					) {
						return [element];
					}

					const relativeTime = this.splitTime - element.startTime;
					const leftVisibleDuration = relativeTime;
					const rightVisibleDuration = element.duration - relativeTime;

					if (this.retainSide === "left") {
						return [
							{
								...element,
								duration: leftVisibleDuration,
								trimEnd: element.trimEnd + rightVisibleDuration,
								name: `${element.name} (left)`,
							},
						];
					}

					if (this.retainSide === "right") {
						const newId = generateUUID();
						this.rightSideElements.push({
							trackId: track.id,
							elementId: newId,
						});
						return [
							{
								...element,
								id: newId,
								startTime: this.splitTime,
								duration: rightVisibleDuration,
								trimStart: element.trimStart + leftVisibleDuration,
								name: `${element.name} (right)`,
							},
						];
					}

					// "both" - split into two pieces
					const secondElementId = generateUUID();
					this.rightSideElements.push({
						trackId: track.id,
						elementId: secondElementId,
					});

					return [
						{
							...element,
							duration: leftVisibleDuration,
							trimEnd: element.trimEnd + rightVisibleDuration,
							name: `${element.name} (left)`,
						},
						{
							...element,
							id: secondElementId,
							startTime: this.splitTime,
							duration: rightVisibleDuration,
							trimStart: element.trimStart + leftVisibleDuration,
							name: `${element.name} (right)`,
						},
					];
				}),
			} as typeof track;
		});

		editor.timeline.updateTracks(updatedTracks);

		if (this.rightSideElements.length > 0) {
			editor.selection.setSelectedElements({
				elements: this.rightSideElements,
			});
		}
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
			editor.selection.setSelectedElements({
				elements: this.previousSelection,
			});
		}
	}
}
