import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import {
	DEFAULT_BLEND_MODE,
	DEFAULT_OPACITY,
	DEFAULT_TRANSFORM,
	TIMELINE_CONSTANTS,
} from "@/constants/timeline-constants";
import type {
	CreateTimelineElement,
	CreateVideoElement,
	CreateImageElement,
	CreateStickerElement,
	CreateUploadAudioElement,
	CreateLibraryAudioElement,
	TextElement,
	TimelineElement,
	TimelineTrack,
	AudioElement,
	VideoElement,
	ImageElement,
	StickerElement,
	UploadAudioElement,
} from "@/types/timeline";
import type { MediaType } from "@/types/assets";

export function canElementHaveAudio(
	element: TimelineElement,
): element is AudioElement | VideoElement {
	return element.type === "audio" || element.type === "video";
}

export function isVisualElement(
	element: TimelineElement,
): element is VideoElement | ImageElement | TextElement | StickerElement {
	return (
		element.type === "video" ||
		element.type === "image" ||
		element.type === "text" ||
		element.type === "sticker"
	);
}

export function canElementBeHidden(
	element: TimelineElement,
): element is VideoElement | ImageElement | TextElement | StickerElement {
	return element.type !== "audio";
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

export function checkElementOverlaps({
	elements,
}: {
	elements: TimelineElement[];
}): boolean {
	const sortedElements = [...elements].sort(
		(a, b) => a.startTime - b.startTime,
	);

	for (let i = 0; i < sortedElements.length - 1; i++) {
		const current = sortedElements[i];
		const next = sortedElements[i + 1];

		const currentEnd = current.startTime + current.duration;

		if (currentEnd > next.startTime) return true;
	}

	return false;
}

export function resolveElementOverlaps({
	elements,
}: {
	elements: TimelineElement[];
}): TimelineElement[] {
	const sortedElements = [...elements].sort(
		(a, b) => a.startTime - b.startTime,
	);
	const resolvedElements: TimelineElement[] = [];

	for (let i = 0; i < sortedElements.length; i++) {
		const current = { ...sortedElements[i] };

		if (resolvedElements.length > 0) {
			const previous = resolvedElements[resolvedElements.length - 1];
			const previousEnd = previous.startTime + previous.duration;

			if (current.startTime < previousEnd) {
				current.startTime = previousEnd;
			}
		}

		resolvedElements.push(current);
	}

	return resolvedElements;
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
	return elements.some((el) => {
		if (excludeElementId && el.id === excludeElementId) return false;
		const elEnd = el.startTime + el.duration;
		return startTime < elEnd && endTime > el.startTime;
	});
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
		name: t.name ?? DEFAULT_TEXT_ELEMENT.name,
		content: t.content ?? DEFAULT_TEXT_ELEMENT.content,
		duration: t.duration ?? TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		fontSize:
			typeof t.fontSize === "number"
				? t.fontSize
				: DEFAULT_TEXT_ELEMENT.fontSize,
		fontFamily: t.fontFamily ?? DEFAULT_TEXT_ELEMENT.fontFamily,
		color: t.color ?? DEFAULT_TEXT_ELEMENT.color,
		backgroundColor: t.backgroundColor ?? DEFAULT_TEXT_ELEMENT.backgroundColor,
		textAlign: t.textAlign ?? DEFAULT_TEXT_ELEMENT.textAlign,
		fontWeight: t.fontWeight ?? DEFAULT_TEXT_ELEMENT.fontWeight,
		fontStyle: t.fontStyle ?? DEFAULT_TEXT_ELEMENT.fontStyle,
		textDecoration: t.textDecoration ?? DEFAULT_TEXT_ELEMENT.textDecoration,
		letterSpacing: t.letterSpacing ?? DEFAULT_TEXT_ELEMENT.letterSpacing,
		lineHeight: t.lineHeight ?? DEFAULT_TEXT_ELEMENT.lineHeight,
		transform: t.transform ?? DEFAULT_TEXT_ELEMENT.transform,
		opacity: t.opacity ?? DEFAULT_TEXT_ELEMENT.opacity,
		blendMode: t.blendMode ?? DEFAULT_BLEND_MODE,
	};
}

export function buildStickerElement({
	stickerId,
	name,
	startTime,
}: {
	stickerId: string;
	name?: string;
	startTime: number;
}): CreateStickerElement {
	const stickerNameFromId =
		stickerId.split(":").slice(1).pop()?.replaceAll("-", " ") ?? stickerId;
	return {
		type: "sticker",
		name: name ?? stickerNameFromId,
		stickerId,
		duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
		startTime,
		trimStart: 0,
		trimEnd: 0,
		transform: { ...DEFAULT_TRANSFORM },
		opacity: DEFAULT_OPACITY,
		blendMode: DEFAULT_BLEND_MODE,
	};
}

export function buildVideoElement({
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
		muted: false,
		hidden: false,
		transform: { ...DEFAULT_TRANSFORM },
		opacity: DEFAULT_OPACITY,
		blendMode: DEFAULT_BLEND_MODE,
	};
}

export function buildImageElement({
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
		transform: { ...DEFAULT_TRANSFORM },
		opacity: DEFAULT_OPACITY,
		blendMode: DEFAULT_BLEND_MODE,
	};
}

export function buildUploadAudioElement({
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
		volume: 1,
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
		volume: 1,
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

export function collectFontFamilies({
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
