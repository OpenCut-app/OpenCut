import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import {
	MASKABLE_ELEMENT_TYPES,
	RETIMABLE_ELEMENT_TYPES,
	TRANSFORMABLE_ELEMENT_TYPES,
	VISUAL_ELEMENT_TYPES,
	type CreateEffectElement,
	type CreateGraphicElement,
	type CreateTimelineElement,
	type CreateVideoElement,
	type CreateImageElement,
	type CreateStickerElement,
	type CreateUploadAudioElement,
	type CreateLibraryAudioElement,
	type TextBackground,
	type TextElement,
	type TimelineElement,
	type TimelineTrack,
	type AudioElement,
	type VideoElement,
	type ImageElement,
	type MaskableElement,
	type RetimableElement,
	type TransformableElement,
	type VisualElement,
	type UploadAudioElement,
} from "@/lib/timeline";
import { DEFAULTS } from "@/lib/timeline/defaults";
import type { MediaType } from "@/lib/media/types";
import { buildDefaultEffectInstance } from "@/lib/effects";
import { buildDefaultGraphicInstance } from "@/lib/graphics";
import type { ParamValues } from "@/lib/params";
import { capitalizeFirstLetter } from "@/utils/string";

export function canElementHaveAudio(
	element: TimelineElement,
): element is AudioElement | VideoElement {
	return element.type === "audio" || element.type === "video";
}

export function isVisualElement(
	element: TimelineElement,
): element is VisualElement {
	return (VISUAL_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

export function isMaskableElement(
	element: TimelineElement,
): element is MaskableElement {
	return (MASKABLE_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

export function isRetimableElement(
	element: TimelineElement,
): element is RetimableElement {
	return (RETIMABLE_ELEMENT_TYPES as readonly string[]).includes(element.type);
}

export function isTransformableElement(
	element: TimelineElement,
): element is TransformableElement {
	return (TRANSFORMABLE_ELEMENT_TYPES as readonly string[]).includes(
		element.type,
	);
}

export function canElementBeHidden(
	element: TimelineElement,
): element is VisualElement {
	return isVisualElement(element);
}

export function hasElementEffects({
	element,
}: {
	element: TimelineElement;
}): boolean {
	return isVisualElement(element) && (element.effects?.length ?? 0) > 0;
}

export function hasMediaId(
	element: TimelineElement,
): element is UploadAudioElement | VideoElement | ImageElement {
	return "mediaId" in element;
}

export function requiresMediaId({
	element,
}: {
	element: CreateTimelineElement;
}): boolean {
	return (
		element.type === "video" ||
		element.type === "image" ||
		(element.type === "audio" && element.sourceType === "upload")
	);
}

export function wouldElementOverlap({
	elements,
	startTime,
	endTime,
	excludeElementId,
}: {
	elements: TimelineElement[];
	startTime: number;
	endTime: number;
	excludeElementId?: string;
}): boolean {
	return elements.some((element) => {
		if (excludeElementId && element.id === excludeElementId) return false;
		const elementEnd = element.startTime + element.duration;
		return startTime < elementEnd && endTime > element.startTime;
	});
}

function buildTextBackground(
	raw: Partial<TextBackground> | undefined,
): TextBackground {
	const color = raw?.color ?? DEFAULTS.text.element.background.color;
	const enabled = raw?.enabled ?? color !== "transparent";
	return {
		enabled,
		color,
		cornerRadius: raw?.cornerRadius,
		paddingX: raw?.paddingX,
		paddingY: raw?.paddingY,
		offsetX: raw?.offsetX,
		offsetY: raw?.offsetY,
	};
}

export function buildTextElement({
	raw,
	startTime,
}: {
	raw: Partial<Omit<TextElement, "type" | "id">>;
	startTime: number;
}): CreateTimelineElement {
	const t = raw as Partial<TextElement>;

	return {
		type: "text",
		name: t.name ?? DEFAULTS.text.element.name,
		content: t.content ?? DEFAULTS.text.element.content,
		duration: t.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		fontSize: t.fontSize ?? DEFAULTS.text.element.fontSize,
		fontFamily: t.fontFamily ?? DEFAULTS.text.element.fontFamily,
		color: t.color ?? DEFAULTS.text.element.color,
		background: buildTextBackground(t.background),
		textAlign: t.textAlign ?? DEFAULTS.text.element.textAlign,
		fontWeight: t.fontWeight ?? DEFAULTS.text.element.fontWeight,
		fontStyle: t.fontStyle ?? DEFAULTS.text.element.fontStyle,
		textDecoration: t.textDecoration ?? DEFAULTS.text.element.textDecoration,
		letterSpacing: t.letterSpacing ?? DEFAULTS.text.element.letterSpacing,
		lineHeight: t.lineHeight ?? DEFAULTS.text.element.lineHeight,
		transform: t.transform ?? DEFAULTS.text.element.transform,
		opacity: t.opacity ?? DEFAULTS.text.element.opacity,
		blendMode: t.blendMode ?? DEFAULTS.element.blendMode,
	};
}

export function buildEffectElement({
	effectType,
	startTime,
	duration,
}: {
	effectType: string;
	startTime: number;
	duration?: number;
}): CreateEffectElement {
	const instance = buildDefaultEffectInstance({ effectType });
	return {
		type: "effect",
		name: capitalizeFirstLetter({ string: instance.type }),
		effectType,
		params: instance.params,
		duration: duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
	};
}

export function buildStickerElement({
	stickerId,
	name,
	startTime,
	intrinsicWidth,
	intrinsicHeight,
}: {
	stickerId: string;
	name?: string;
	startTime: number;
	intrinsicWidth?: number;
	intrinsicHeight?: number;
}): CreateStickerElement {
	const stickerNameFromId =
		stickerId.split(":").slice(1).pop()?.replaceAll("-", " ") ?? stickerId;
	return {
		type: "sticker",
		name: name ?? stickerNameFromId,
		stickerId,
		intrinsicWidth,
		intrinsicHeight,
		duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		transform: {
			...DEFAULTS.element.transform,
			position: { ...DEFAULTS.element.transform.position },
		},
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
	};
}

export function buildGraphicElement({
	definitionId,
	name,
	startTime,
	params,
}: {
	definitionId: string;
	name?: string;
	startTime: number;
	params?: Partial<ParamValues>;
}): CreateGraphicElement {
	const instance = buildDefaultGraphicInstance({ definitionId });
	return {
		type: "graphic",
		name: name ?? capitalizeFirstLetter({ string: instance.definitionId }),
		definitionId: instance.definitionId,
		params: { ...instance.params, ...(params ?? {}) } as ParamValues,
		duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		transform: {
			...DEFAULTS.element.transform,
			position: { ...DEFAULTS.element.transform.position },
		},
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
	};
}

function buildVideoElement({
	mediaId,
	name,
	duration,
	startTime,
}: {
	mediaId: string;
	name: string;
	duration: number;
	startTime: number;
}): CreateVideoElement {
	return {
		type: "video",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		sourceDuration: duration,
		muted: false,
		hidden: false,
		transform: {
			...DEFAULTS.element.transform,
			position: { ...DEFAULTS.element.transform.position },
		},
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
		volume: DEFAULTS.element.volume,
	};
}

function buildImageElement({
	mediaId,
	name,
	duration,
	startTime,
}: {
	mediaId: string;
	name: string;
	duration: number;
	startTime: number;
}): CreateImageElement {
	return {
		type: "image",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		hidden: false,
		transform: {
			...DEFAULTS.element.transform,
			position: { ...DEFAULTS.element.transform.position },
		},
		opacity: DEFAULTS.element.opacity,
		blendMode: DEFAULTS.element.blendMode,
	};
}

function buildUploadAudioElement({
	mediaId,
	name,
	duration,
	startTime,
	buffer,
}: {
	mediaId: string;
	name: string;
	duration: number;
	startTime: number;
	buffer?: AudioBuffer;
}): CreateUploadAudioElement {
	const element: CreateUploadAudioElement = {
		type: "audio",
		sourceType: "upload",
		mediaId,
		name,
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		sourceDuration: duration,
		volume: DEFAULTS.element.volume,
		muted: false,
	};
	if (buffer) {
		element.buffer = buffer;
	}
	return element;
}

export function buildElementFromMedia({
	mediaId,
	mediaType,
	name,
	duration,
	startTime,
	buffer,
}: {
	mediaId: string;
	mediaType: MediaType;
	name: string;
	duration: number;
	startTime: number;
	buffer?: AudioBuffer;
}): CreateTimelineElement {
	switch (mediaType) {
		case "audio":
			return buildUploadAudioElement({
				mediaId,
				name,
				duration,
				startTime,
				buffer,
			});
		case "video":
			return buildVideoElement({ mediaId, name, duration, startTime });
		case "image":
			return buildImageElement({ mediaId, name, duration, startTime });
	}
}

export function buildLibraryAudioElement({
	sourceUrl,
	name,
	duration,
	startTime,
	buffer,
}: {
	sourceUrl: string;
	name: string;
	duration: number;
	startTime: number;
	buffer?: AudioBuffer;
}): CreateLibraryAudioElement {
	const element: CreateLibraryAudioElement = {
		type: "audio",
		sourceType: "library",
		sourceUrl,
		name,
		duration,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		sourceDuration: duration,
		volume: DEFAULTS.element.volume,
		muted: false,
	};
	if (buffer) {
		element.buffer = buffer;
	}
	return element;
}

export function getElementsAtTime({
	tracks,
	time,
}: {
	tracks: TimelineTrack[];
	time: number;
}): { trackId: string; elementId: string }[] {
	const result: { trackId: string; elementId: string }[] = [];

	for (const track of tracks) {
		for (const element of track.elements) {
			const elementStart = element.startTime;
			const elementEnd = element.startTime + element.duration;

			if (time > elementStart && time < elementEnd) {
				result.push({ trackId: track.id, elementId: element.id });
			}
		}
	}

	return result;
}

export function getElementFontFamilies({
	tracks,
}: {
	tracks: TimelineTrack[];
}): string[] {
	const families = new Set<string>();
	for (const track of tracks) {
		for (const element of track.elements) {
			if (element.type === "text" && element.fontFamily) {
				families.add(element.fontFamily);
			}
		}
	}
	return [...families];
}
