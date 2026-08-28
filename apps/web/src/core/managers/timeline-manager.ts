import type { EditorCore } from "@/core";
import type { ParamValues } from "@/lib/params";
import type {
	TrackType,
	TimelineTrack,
	TimelineElement,
	ClipboardItem,
	RetimeConfig,
} from "@/lib/timeline";
import type {
	AnimationPath,
	AnimationInterpolation,
	AnimationValue,
} from "@/lib/animation/types";
import { calculateTotalDuration } from "@/lib/timeline";
import { getLastFrameTime } from "@/lib/time";
import {
	AddTrackCommand,
	RemoveTrackCommand,
	ToggleTrackMuteCommand,
	ToggleTrackVisibilityCommand,
	InsertElementCommand,
	UpdateElementTrimCommand,
	UpdateElementDurationCommand,
	DeleteElementsCommand,
	DuplicateElementsCommand,
	ToggleElementsVisibilityCommand,
	ToggleElementsMutedCommand,
	UpdateElementCommand,
	SplitElementsCommand,
	PasteCommand,
	UpdateElementStartTimeCommand,
	MoveElementCommand,
	TracksSnapshotCommand,
	UpdateElementRetimeCommand,
	UpsertKeyframeCommand,
	RemoveKeyframeCommand,
	RetimeKeyframeCommand,
	AddClipEffectCommand,
	RemoveClipEffectCommand,
	UpdateClipEffectParamsCommand,
	ToggleClipEffectCommand,
	ReorderClipEffectsCommand,
	RemoveMaskCommand,
	ToggleMaskInvertedCommand,
	UpsertEffectParamKeyframeCommand,
	RemoveEffectParamKeyframeCommand,
	AddClipTransformCommand,
	ApplyTransformPresetCommand,
	RemoveClipTransformCommand,
	UpdateClipTransformParamsCommand,
	ToggleClipTransformCommand,
	ReorderClipTransformsCommand,
	UpsertTransformParamKeyframeCommand,
	RemoveTransformParamKeyframeCommand,
} from "@/lib/commands/timeline";
import { BatchCommand } from "@/lib/commands";
import type { InsertElementParams } from "@/lib/commands/timeline/element/insert-element";

export class TimelineManager {
	private listeners = new Set<() => void>();
	private previewOverlay = new Map<string, Partial<TimelineElement>>();
	private previewTracks: TimelineTrack[] | null = null;

	constructor(private editor: EditorCore) {}

	addTrack({ type, index }: { type: TrackType; index?: number }): string {
		const command = new AddTrackCommand(type, index);
		this.editor.command.execute({ command });
		return command.getTrackId();
	}

	removeTrack({ trackId }: { trackId: string }): void {
		const command = new RemoveTrackCommand(trackId);
		this.editor.command.execute({ command });
	}

	insertElement({ element, placement }: InsertElementParams): void {
		const command = new InsertElementCommand({ element, placement });
		this.editor.command.execute({ command });
	}

	updateElementTrim({
		elementId,
		trimStart,
		trimEnd,
		startTime,
		duration,
		pushHistory = true,
		rippleEnabled = false,
	}: {
		elementId: string;
		trimStart: number;
		trimEnd: number;
		startTime?: number;
		duration?: number;
		pushHistory?: boolean;
		rippleEnabled?: boolean;
	}): void {
		const command = new UpdateElementTrimCommand({
			elementId,
			trimStart,
			trimEnd,
			startTime,
			duration,
			rippleEnabled,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	updateElementDuration({
		trackId,
		elementId,
		duration,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		duration: number;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateElementDurationCommand({
			trackId,
			elementId,
			duration,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	updateElementRetime({
		trackId,
		elementId,
		retime,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		retime?: RetimeConfig;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateElementRetimeCommand({
			trackId,
			elementId,
			retime,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	updateElementStartTime({
		elements,
		startTime,
	}: {
		elements: { trackId: string; elementId: string }[];
		startTime: number;
	}): void {
		const command = new UpdateElementStartTimeCommand({
			elements,
			startTime,
		});
		this.editor.command.execute({ command });
	}

	moveElement({
		sourceTrackId,
		targetTrackId,
		elementId,
		newStartTime,
		createTrack,
		rippleEnabled = false,
	}: {
		sourceTrackId: string;
		targetTrackId: string;
		elementId: string;
		newStartTime: number;
		createTrack?: { type: TrackType; index: number };
		rippleEnabled?: boolean;
	}): void {
		const command = new MoveElementCommand({
			sourceTrackId,
			targetTrackId,
			elementId,
			newStartTime,
			createTrack,
			rippleEnabled,
		});
		this.editor.command.execute({ command });
	}

	toggleTrackMute({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackMuteCommand(trackId);
		this.editor.command.execute({ command });
	}

	toggleTrackVisibility({ trackId }: { trackId: string }): void {
		const command = new ToggleTrackVisibilityCommand(trackId);
		this.editor.command.execute({ command });
	}

	splitElements({
		elements,
		splitTime,
		retainSide = "both",
		rippleEnabled = false,
	}: {
		elements: { trackId: string; elementId: string }[];
		splitTime: number;
		retainSide?: "both" | "left" | "right";
		rippleEnabled?: boolean;
	}): { trackId: string; elementId: string }[] {
		const command = new SplitElementsCommand({
			elements,
			splitTime,
			retainSide,
			rippleEnabled,
		});
		this.editor.command.execute({ command });
		return command.getRightSideElements();
	}

	getTotalDuration(): number {
		return calculateTotalDuration({ tracks: this.getTracks() });
	}

	getLastSeekableTime(): number {
		const duration = this.getTotalDuration();
		const fps = this.editor.project.getActive()?.settings.fps;
		if (!fps || duration <= 0) return duration;
		return getLastFrameTime({ duration, fps });
	}

	getTrackById({ trackId }: { trackId: string }): TimelineTrack | null {
		return this.getTracks().find((track) => track.id === trackId) ?? null;
	}

	getElementsWithTracks({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): Array<{ track: TimelineTrack; element: TimelineElement }> {
		const result: Array<{ track: TimelineTrack; element: TimelineElement }> =
			[];

		for (const { trackId, elementId } of elements) {
			const track = this.getTrackById({ trackId });
			const element = track?.elements.find(
				(trackElement) => trackElement.id === elementId,
			);

			if (track && element) {
				result.push({ track, element });
			}
		}

		return result;
	}

	pasteAtTime({
		time,
		clipboardItems,
	}: {
		time: number;
		clipboardItems: ClipboardItem[];
	}): { trackId: string; elementId: string }[] {
		const command = new PasteCommand(time, clipboardItems);
		this.editor.command.execute({ command });
		return command.getPastedElements();
	}

	deleteElements({
		elements,
		rippleEnabled = false,
	}: {
		elements: { trackId: string; elementId: string }[];
		rippleEnabled?: boolean;
	}): void {
		const command = new DeleteElementsCommand({ elements, rippleEnabled });
		this.editor.command.execute({ command });
	}

	updateElements({
		updates,
		pushHistory = true,
	}: {
		updates: Array<{
			trackId: string;
			elementId: string;
			updates: Partial<TimelineElement>;
		}>;
		pushHistory?: boolean;
	}): void {
		const commands = updates.map(
			({ trackId, elementId, updates: elementUpdates }) =>
				new UpdateElementCommand({
					trackId,
					elementId,
					updates: elementUpdates,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	addClipEffect({
		trackId,
		elementId,
		effectType,
	}: {
		trackId: string;
		elementId: string;
		effectType: string;
	}): string {
		const command = new AddClipEffectCommand({
			trackId,
			elementId,
			effectType,
		});
		this.editor.command.execute({ command });
		return command.getEffectId() ?? "";
	}

	removeClipEffect({
		trackId,
		elementId,
		effectId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
	}): void {
		const command = new RemoveClipEffectCommand({
			trackId,
			elementId,
			effectId,
		});
		this.editor.command.execute({ command });
	}

	removeMask({
		trackId,
		elementId,
		maskId,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
	}): void {
		const command = new RemoveMaskCommand({
			trackId,
			elementId,
			maskId,
		});
		this.editor.command.execute({ command });
	}

	updateClipEffectParams({
		trackId,
		elementId,
		effectId,
		params,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		params: Partial<ParamValues>;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateClipEffectParamsCommand({
			trackId,
			elementId,
			effectId,
			params,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	toggleClipEffect({
		trackId,
		elementId,
		effectId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
	}): void {
		const command = new ToggleClipEffectCommand({
			trackId,
			elementId,
			effectId,
		});
		this.editor.command.execute({ command });
	}

	toggleMaskInverted({
		trackId,
		elementId,
		maskId,
	}: {
		trackId: string;
		elementId: string;
		maskId: string;
	}): void {
		const command = new ToggleMaskInvertedCommand({
			trackId,
			elementId,
			maskId,
		});
		this.editor.command.execute({ command });
	}

	reorderClipEffects({
		trackId,
		elementId,
		fromIndex,
		toIndex,
	}: {
		trackId: string;
		elementId: string;
		fromIndex: number;
		toIndex: number;
	}): void {
		const command = new ReorderClipEffectsCommand({
			trackId,
			elementId,
			fromIndex,
			toIndex,
		});
		this.editor.command.execute({ command });
	}

	addClipTransform({
		trackId,
		elementId,
		transformType,
	}: {
		trackId: string;
		elementId: string;
		transformType: string;
	}): string {
		const command = new AddClipTransformCommand({
			trackId,
			elementId,
			transformType,
		});
		this.editor.command.execute({ command });
		return command.getTransformId() ?? "";
	}

	applyTransformPreset({
		trackId,
		elementId,
		presetType,
	}: {
		trackId: string;
		elementId: string;
		presetType: string;
	}): string[] {
		const command = new ApplyTransformPresetCommand({
			trackId,
			elementId,
			presetType,
		});
		this.editor.command.execute({ command });
		return command.getTransformIds();
	}

	removeClipTransform({
		trackId,
		elementId,
		transformId,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
	}): void {
		const command = new RemoveClipTransformCommand({
			trackId,
			elementId,
			transformId,
		});
		this.editor.command.execute({ command });
	}

	updateClipTransformParams({
		trackId,
		elementId,
		transformId,
		params,
		pushHistory = true,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
		params: Partial<ParamValues>;
		pushHistory?: boolean;
	}): void {
		const command = new UpdateClipTransformParamsCommand({
			trackId,
			elementId,
			transformId,
			params,
		});
		if (pushHistory) {
			this.editor.command.execute({ command });
		} else {
			command.execute();
		}
	}

	toggleClipTransform({
		trackId,
		elementId,
		transformId,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
	}): void {
		const command = new ToggleClipTransformCommand({
			trackId,
			elementId,
			transformId,
		});
		this.editor.command.execute({ command });
	}

	reorderClipTransforms({
		trackId,
		elementId,
		fromIndex,
		toIndex,
	}: {
		trackId: string;
		elementId: string;
		fromIndex: number;
		toIndex: number;
	}): void {
		const command = new ReorderClipTransformsCommand({
			trackId,
			elementId,
			fromIndex,
			toIndex,
		});
		this.editor.command.execute({ command });
	}

	upsertKeyframes({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			time: number;
			value: AnimationValue;
			interpolation?: AnimationInterpolation;
			keyframeId?: string;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		const commands = keyframes.map(
			({
				trackId,
				elementId,
				propertyPath,
				time,
				value,
				interpolation,
				keyframeId,
			}) =>
				new UpsertKeyframeCommand({
					trackId,
					elementId,
					propertyPath,
					time,
					value,
					interpolation,
					keyframeId,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		this.editor.command.execute({ command });
	}

	removeKeyframes({
		keyframes,
	}: {
		keyframes: Array<{
			trackId: string;
			elementId: string;
			propertyPath: AnimationPath;
			keyframeId: string;
		}>;
	}): void {
		if (keyframes.length === 0) {
			return;
		}

		const commands = keyframes.map(
			({ trackId, elementId, propertyPath, keyframeId }) =>
				new RemoveKeyframeCommand({
					trackId,
					elementId,
					propertyPath,
					keyframeId,
				}),
		);
		const command =
			commands.length === 1 ? commands[0] : new BatchCommand(commands);
		this.editor.command.execute({ command });
	}

	retimeKeyframe({
		trackId,
		elementId,
		propertyPath,
		keyframeId,
		time,
	}: {
		trackId: string;
		elementId: string;
		propertyPath: AnimationPath;
		keyframeId: string;
		time: number;
	}): void {
		const command = new RetimeKeyframeCommand({
			trackId,
			elementId,
			propertyPath,
			keyframeId,
			nextTime: time,
		});
		this.editor.command.execute({ command });
	}

	upsertEffectParamKeyframe({
		trackId,
		elementId,
		effectId,
		paramKey,
		time,
		value,
		interpolation,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		paramKey: string;
		time: number;
		value: number;
		interpolation?: "linear" | "hold";
		keyframeId?: string;
	}): void {
		const command = new UpsertEffectParamKeyframeCommand({
			trackId,
			elementId,
			effectId,
			paramKey,
			time,
			value,
			interpolation,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	removeEffectParamKeyframe({
		trackId,
		elementId,
		effectId,
		paramKey,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		effectId: string;
		paramKey: string;
		keyframeId: string;
	}): void {
		const command = new RemoveEffectParamKeyframeCommand({
			trackId,
			elementId,
			effectId,
			paramKey,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	upsertTransformParamKeyframe({
		trackId,
		elementId,
		transformId,
		paramKey,
		time,
		value,
		interpolation,
		keyframeId,
	}: {
		trackId: string;
		elementId: string;
		transformId: string;
		paramKey: string;
		time: number;
		value: number;
		interpolation?: "linear" | "hold";
		keyframeId?: string;
	}): void {
		const command = new UpsertTransformParamKeyframeCommand({
			trackId,
			elementId,
			transformId,
			paramKey,
			time,
			value,
			interpolation,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	removeTransformParamKeyframe({
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
	}): void {
		const command = new RemoveTransformParamKeyframeCommand({
			trackId,
			elementId,
			transformId,
			paramKey,
			keyframeId,
		});
		this.editor.command.execute({ command });
	}

	isPreviewActive(): boolean {
		return this.previewOverlay.size > 0;
	}

	previewElements({
		updates,
	}: {
		updates: Array<{
			trackId: string;
			elementId: string;
			updates: Partial<TimelineElement>;
		}>;
	}): void {
		for (const { elementId, updates: elementUpdates } of updates) {
			const existingOverlay = this.previewOverlay.get(elementId);
			const mergedOverlay = {
				...existingOverlay,
				...elementUpdates,
			} as Partial<TimelineElement>;
			this.previewOverlay.set(elementId, mergedOverlay);
		}
		const committedTracks = this.editor.scenes.getActiveScene()?.tracks ?? [];
		this.previewTracks = this.applyPreviewOverlay(committedTracks);
		this.notify();
	}

	commitPreview(): void {
		if (this.previewOverlay.size === 0) return;
		const committedTracks = this.editor.scenes.getActiveScene()?.tracks ?? [];
		const afterTracks =
			this.previewTracks ?? this.applyPreviewOverlay(committedTracks);
		const command = new TracksSnapshotCommand(committedTracks, afterTracks);
		this.editor.command.push({ command });
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.updateTracks(afterTracks);
	}

	discardPreview(): void {
		if (this.previewOverlay.size === 0) return;
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.notify();
	}

	private applyPreviewOverlay(tracks: TimelineTrack[]): TimelineTrack[] {
		if (this.previewOverlay.size === 0) return tracks;
		return tracks.map((track) => {
			const hasOverlay = track.elements.some((el) =>
				this.previewOverlay.has(el.id),
			);
			if (!hasOverlay) return track;
			const newElements = track.elements.map((el) => {
				const overlay = this.previewOverlay.get(el.id);
				return overlay ? ({ ...el, ...overlay } as TimelineElement) : el;
			});
			return { ...track, elements: newElements } as TimelineTrack;
		});
	}

	duplicateElements({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): { trackId: string; elementId: string }[] {
		const command = new DuplicateElementsCommand({ elements });
		this.editor.command.execute({ command });
		return command.getDuplicatedElements();
	}

	toggleElementsVisibility({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new ToggleElementsVisibilityCommand(elements);
		this.editor.command.execute({ command });
	}

	toggleElementsMuted({
		elements,
	}: {
		elements: { trackId: string; elementId: string }[];
	}): void {
		const command = new ToggleElementsMutedCommand(elements);
		this.editor.command.execute({ command });
	}

	getTracks(): TimelineTrack[] {
		return this.editor.scenes.getActiveScene()?.tracks ?? [];
	}

	getRenderTracks(): TimelineTrack[] {
		if (this.previewTracks !== null) return this.previewTracks;
		return this.getTracks();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private notify(): void {
		this.listeners.forEach((fn) => {
			fn();
		});
	}

	updateTracks(newTracks: TimelineTrack[]): void {
		this.previewOverlay.clear();
		this.previewTracks = null;
		this.editor.scenes.updateSceneTracks({ tracks: newTracks });
		this.notify();
	}
}
