import type { TextElement } from "@/types/timeline";
import {
	DEFAULT_OPACITY,
	DEFAULT_TRANSFORM,
	TIMELINE_CONSTANTS,
} from "./timeline-constants";

export const MIN_FONT_SIZE = 5;
export const MAX_FONT_SIZE = 300;

/**
 * higher value: smaller font size
 * lower value: larger font size
 */
export const FONT_SIZE_SCALE_REFERENCE = 90;

export const DEFAULT_LETTER_SPACING = 0;
export const DEFAULT_LINE_HEIGHT = 1.2;

export const DEFAULT_TEXT_ELEMENT: Omit<TextElement, "id"> = {
	type: "text",
	name: "Text",
	content: "Default text",
	fontSize: 15,
	fontFamily: "Arial",
	color: "#ffffff",
	backgroundColor: "#000000",
	textAlign: "center",
	fontWeight: "normal",
	fontStyle: "normal",
	textDecoration: "none",
	letterSpacing: DEFAULT_LETTER_SPACING,
	lineHeight: DEFAULT_LINE_HEIGHT,
	duration: TIMELINE_CONSTANTS.DEFAULT_ELEMENT_DURATION,
	startTime: 0,
	trimStart: 0,
	trimEnd: 0,
	transform: DEFAULT_TRANSFORM,
	opacity: DEFAULT_OPACITY,
};
