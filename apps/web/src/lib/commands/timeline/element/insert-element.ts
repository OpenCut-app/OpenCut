import { Command } from "@/lib/commands/base-command";
import { EditorCore } from "@/core";
import type {
	CreateTimelineElement,
	TimelineTrack,
	TimelineElement,
	TrackType,
	ElementType,
} from "@/types/timeline";
import { generateUUID } from "@/utils/id";
import {
	requiresMediaId,
	wouldElementOverlap,
} from "@/lib/timeline/element-utils";
import {
	buildEmptyTrack,
	canElementGoOnTrack,
	getDefaultInsertIndexForTrack,
	validateElementTrackCompatibility,
	enforceMainTrackStart,
} from "@/lib/timeline/track-utils";
import type { MediaAsset } from "@/types/assets";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";

type InsertElementPlacement =
	| { mode: "explicit"; trackId: string }
	| { mode: "auto"; trackType?: TrackType; insertIndex?: number };

export interface InsertElementParams {
	element: CreateTimelineElement;
	placement: InsertElementPlacement;
}

export class InsertElementCommand extends Command {
	private elementId: string;
	private savedState: TimelineTrack[] | null = null;
	private targetTrackId: string | null = null;

	constructor({ element, placement }: InsertElementParams) {
		super();
		this.elementId = generateUUID();
		this.element = element;
		this.placement = placement;
	}

	private element: CreateTimelineElement;
	private placement: InsertElementPlacement;

	execute(): void {
		const editor = EditorCore.getInstance();
		this.savedState = editor.timeline.getTracks();

		if (!this.savedState) {
			console.error("Tracks not available");
			return;
		}

		if (!this.validateElementBasics({ element: this.element })) {
			return;
		}

		const totalElementsInTimeline = this.savedState.reduce(
			(total, t) => total + t.elements.length,
			0,
		);
		const isFirstElement = totalElementsInTimeline === 0;

		const newElement = this.buildElement({ element: this.element });
		const updateResult = this.resolveTracksWithElement({
			tracks: this.savedState,
			element: newElement,
		});

		if (!updateResult) {
			return;
		}

		const { updatedTracks, targetTrackId } = updateResult;
		this.targetTrackId = targetTrackId;

		const isVisualMedia =
			newElement.type === "video" || newElement.type === "image";

		if (isFirstElement && isVisualMedia) {
			const mediaAssets = editor.media.getAssets();
			const activeProject = editor.project.getActive();
			const asset = mediaAssets.find(
				(item: MediaAsset) => item.id === newElement.mediaId,
			);

			if (asset?.width && asset?.height) {
				const nextCanvasSize = { width: asset.width, height: asset.height };
				const shouldSetOriginalCanvasSize =
					!activeProject?.settings.originalCanvasSize;
				editor.project.updateSettings({
					settings: {
						canvasSize: nextCanvasSize,
						...(shouldSetOriginalCanvasSize
							? { originalCanvasSize: nextCanvasSize }
							: {}),
					},
					pushHistory: false,
				});
			}

			if (asset?.type === "video" && asset?.fps) {
				editor.project.updateSettings({
					settings: { fps: asset.fps },
					pushHistory: false,
				});
			}
		}

		editor.timeline.updateTracks(updatedTracks);
	}

	undo(): void {
		if (this.savedState) {
			const editor = EditorCore.getInstance();
			editor.timeline.updateTracks(this.savedState);
		}
	}

	getElementId(): string {
		return this.elementId;
	}

	getTrackId(): string | null {
		return this.targetTrackId;
	}

	private buildElement({
		element,
	}: {
		element: CreateTimelineElement;
	}): TimelineElement {
		return {
			...element,
			id: this.elementId,
			startTime: element.startTime,
			trimStart: element.trimStart ?? 0,
			trimEnd: element.trimEnd ?? 0,
			duration: element.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		} as TimelineElement;
	}

	private validateElementBasics({
		element,
	}: {
		element: CreateTimelineElement;
	}): boolean {
		if (requiresMediaId({ element }) && !("mediaId" in element)) {
			console.error("Element requires mediaId");
			return false;
		}

		if (
			element.type === "audio" &&
			element.sourceType === "library" &&
			!element.sourceUrl
		) {
			console.error("Library audio element must have sourceUrl");
			return false;
		}

		if (element.type === "sticker" && !element.stickerId) {
			console.error("Sticker element must have stickerId");
			return false;
		}

		if (element.type === "text" && !element.content) {
			console.error("Text element must have content");
			return false;
		}

		return true;
	}

	private resolveTracksWithElement({
		tracks,
		element,
	}: {
		tracks: TimelineTrack[];
		element: TimelineElement;
	}): { updatedTracks: TimelineTrack[]; targetTrackId: string } | null {
		const placement = this.placement;

		if (placement.mode === "explicit") {
			const targetTrack = tracks.find(
				(track) => track.id === placement.trackId,
			);

			if (!targetTrack) {
				console.error("Track not found:", placement.trackId);
				return null;
			}

			const validation = validateElementTrackCompatibility({
				element,
				track: targetTrack,
			});

			if (!validation.isValid) {
				console.error(validation.errorMessage);
				return null;
			}

			const adjustedElement = this.adjustElementForMainTrack({
				tracks,
				targetTrackId: targetTrack.id,
				element,
			});

			const updatedTracks = tracks.map((track) =>
				track.id === targetTrack.id
					? {
							...track,
							elements: [...track.elements, adjustedElement],
						}
					: track,
			) as TimelineTrack[];

			return { updatedTracks, targetTrackId: targetTrack.id };
		}

		const trackType =
			placement.trackType ?? this.getTrackTypeForElement({ element });

		if (
			placement.trackType &&
			!canElementGoOnTrack({
				elementType: element.type,
				trackType,
			})
		) {
			console.error(
				`${element.type} elements cannot be placed on ${trackType} tracks`,
			);
			return null;
		}

		const elementEndTime = element.startTime + element.duration;
		const existingTrack = tracks.find((track) => {
			if (
				!canElementGoOnTrack({
					elementType: element.type,
					trackType: track.type,
				})
			) {
				return false;
			}

			return !wouldElementOverlap({
				elements: track.elements,
				startTime: element.startTime,
				endTime: elementEndTime,
			});
		});

		if (existingTrack) {
			const adjustedElement = this.adjustElementForMainTrack({
				tracks,
				targetTrackId: existingTrack.id,
				element,
			});

			const updatedTracks = tracks.map((track) =>
				track.id === existingTrack.id
					? {
							...track,
							elements: [...track.elements, adjustedElement],
						}
					: track,
			) as TimelineTrack[];

			return { updatedTracks, targetTrackId: existingTrack.id };
		}

		const newTrackId = generateUUID();
		const newTrack = buildEmptyTrack({
			id: newTrackId,
			type: trackType,
		});
		const newTrackWithElement = {
			...newTrack,
			elements: [...newTrack.elements, element],
		} as TimelineTrack;

		const updatedTracks = [...tracks];
		const insertIndex =
			placement.insertIndex ??
			this.getAutoInsertIndex({ tracks: updatedTracks, trackType });
		updatedTracks.splice(insertIndex, 0, newTrackWithElement);

		return { updatedTracks, targetTrackId: newTrackId };
	}

	private getAutoInsertIndex({
		tracks,
		trackType,
	}: {
		tracks: TimelineTrack[];
		trackType: TrackType;
	}): number {
		if (trackType === "text") {
			const firstVideoTrackIndex = tracks.findIndex(
				(track) => track.type === "video",
			);
			if (firstVideoTrackIndex >= 0) {
				return firstVideoTrackIndex;
			}
		}

		return getDefaultInsertIndexForTrack({
			tracks,
			trackType,
		});
	}

	private adjustElementForMainTrack({
		tracks,
		targetTrackId,
		element,
	}: {
		tracks: TimelineTrack[];
		targetTrackId: string;
		element: TimelineElement;
	}): TimelineElement {
		const adjustedStartTime = enforceMainTrackStart({
			tracks,
			targetTrackId,
			requestedStartTime: element.startTime,
		});
		return { ...element, startTime: adjustedStartTime };
	}

	private getTrackTypeForElement({
		element,
	}: {
		element: { type: ElementType };
	}): TrackType {
		if (element.type === "video" || element.type === "image") {
			return "video";
		}
		return element.type;
	}
}
