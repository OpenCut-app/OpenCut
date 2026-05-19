import { describe, expect, test } from "bun:test";
import {
	getTimelineElementClassName,
	getTimelineElementClassNameForElement,
	TIMELINE_ELEMENT_THEME,
	TIMELINE_TRACK_THEME,
} from "../theme";

describe("getTimelineElementClassName", () => {
	test("returns the configured class for each track type", () => {
		expect(getTimelineElementClassName({ type: "audio" })).toBe(
			TIMELINE_TRACK_THEME.audio.elementClassName.trim(),
		);
		expect(getTimelineElementClassName({ type: "text" })).toBe(
			TIMELINE_TRACK_THEME.text.elementClassName.trim(),
		);
	});
});

describe("getTimelineElementClassNameForElement", () => {
	test("uses the element-level theme when one is defined", () => {
		expect(
			getTimelineElementClassNameForElement({
				elementType: "video",
				trackType: "video",
			}),
		).toBe(TIMELINE_ELEMENT_THEME.video?.elementClassName.trim());
	});

	test("distinguishes video and image even though they share the video track", () => {
		const videoClass = getTimelineElementClassNameForElement({
			elementType: "video",
			trackType: "video",
		});
		const imageClass = getTimelineElementClassNameForElement({
			elementType: "image",
			trackType: "video",
		});
		expect(videoClass).not.toBe(imageClass);
	});

	test("falls back to the track-level theme when an element type has no override", () => {
		expect(
			getTimelineElementClassNameForElement({
				elementType: "audio",
				trackType: "audio",
			}),
		).toBe(TIMELINE_TRACK_THEME.audio.elementClassName.trim());

		expect(
			getTimelineElementClassNameForElement({
				elementType: "text",
				trackType: "text",
			}),
		).toBe(TIMELINE_TRACK_THEME.text.elementClassName.trim());

		expect(
			getTimelineElementClassNameForElement({
				elementType: "sticker",
				trackType: "graphic",
			}),
		).toBe(TIMELINE_TRACK_THEME.graphic.elementClassName.trim());
	});
});
