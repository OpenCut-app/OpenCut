import type { ElementType, TrackType } from "@/timeline";

export const TIMELINE_AUDIO_WAVEFORM_COLOR = "rgba(255, 255, 255, 0.7)";

export const TIMELINE_TRACK_THEME: Record<
	TrackType,
	{
		elementClassName: string;
		waveformColor?: string;
	}
> = {
	video: { elementClassName: "transparent" },
	text: { elementClassName: "bg-[#5DBAA0]" },
	audio: {
		elementClassName: "bg-[#8F5DBA]",
		waveformColor: TIMELINE_AUDIO_WAVEFORM_COLOR,
	},
	graphic: { elementClassName: "bg-[#BA5D7A]" },
	effect: { elementClassName: "bg-[#5d93ba]" },
} as const;

/**
 * Per-element-type background tint applied to clips on the timeline.
 *
 * Falls back to the track-level theme when an element type has no
 * dedicated entry. Used so that clips on the same track (e.g. video
 * and image, which both live on the "video" track) can still be
 * visually distinguished from each other and from the timeline
 * background.
 */
export const TIMELINE_ELEMENT_THEME: Partial<
	Record<ElementType, { elementClassName: string }>
> = {
	video: { elementClassName: "bg-sky-500/20" },
	image: { elementClassName: "bg-amber-500/20" },
} as const;

export const SELECTED_TRACK_ROW_CLASS = "bg-accent/50";
export const DEFAULT_TIMELINE_BOOKMARK_COLOR = "#009dff";

export function getTimelineElementClassName({
	type,
}: {
	type: TrackType;
}): string {
	return TIMELINE_TRACK_THEME[type].elementClassName.trim();
}

export function getTimelineElementClassNameForElement({
	elementType,
	trackType,
}: {
	elementType: ElementType;
	trackType: TrackType;
}): string {
	const elementTheme = TIMELINE_ELEMENT_THEME[elementType];
	if (elementTheme) {
		return elementTheme.elementClassName.trim();
	}
	return TIMELINE_TRACK_THEME[trackType].elementClassName.trim();
}
