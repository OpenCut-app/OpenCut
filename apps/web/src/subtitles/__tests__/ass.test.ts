import { describe, expect, test } from "bun:test";
import { parseAss } from "../ass";

describe("parseAss", () => {
	const MINIMAL_ASS = `[Script Info]
Title: Test
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello World`;

	describe("basic parsing", () => {
		test("parses a minimal ASS file with one dialogue", () => {
			const result = parseAss({ input: MINIMAL_ASS });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Hello World");
			expect(result.captions[0].startTime).toBe(1);
			expect(result.captions[0].duration).toBe(2);
			expect(result.skippedCueCount).toBe(0);
		});

		test("parses multiple dialogue lines", () => {
			const input = `${MINIMAL_ASS}
Dialogue: 0,0:00:05.00,0:00:07.00,Default,,0,0,0,,Second line`;
			const result = parseAss({ input });
			expect(result.captions).toHaveLength(2);
			expect(result.captions[1].text).toBe("Second line");
			expect(result.captions[1].startTime).toBe(5);
			expect(result.captions[1].duration).toBe(2);
		});
	});

	describe("play resolution", () => {
		test("uses default resolution 384x288 when not specified", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Test`;
			const result = parseAss({ input });
			expect(result.captions[0].style?.fontSizeRatioOfPlayHeight).toBeCloseTo(20 / 288, 3);
		});

		test("uses custom play resolution from Script Info", () => {
			const input = `[Script Info]
Title: Test
PlayResX: 1920
PlayResY: 1080
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,100,100,50,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Custom res`;
			const result = parseAss({ input });
			expect(result.captions[0].style?.fontSizeRatioOfPlayHeight).toBeCloseTo(48 / 1080, 3);
		});
	});

	describe("style parsing", () => {
		test("parses v4+ style properties", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Helvetica,36,&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,-1,0,0,100,100,2,0,1,2,0,5,20,20,15,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Styled text`;
			const result = parseAss({ input });
			const style = result.captions[0].style;
			expect(style).toBeDefined();
			expect(style?.fontFamily).toBe("Helvetica");
			expect(style?.fontWeight).toBe("bold");
			expect(style?.fontStyle).toBe("italic");
			expect(style?.letterSpacing).toBe(2);
			expect(style?.textAlign).toBe("center");
			expect(style?.placement?.verticalAlign).toBe("middle");
		});

		test("falls back to default style for missing style name", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,NonExistent,,0,0,0,,Fallback test`;
			const result = parseAss({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].style).toBeDefined();
			expect(result.warnings.some((w) => w.includes("missing ASS styles"))).toBe(true);
		});
	});

	describe("event format fields", () => {
		test("handles extra comma in text field (last field captures remainder)", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello, world`;
			const result = parseAss({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Hello, world");
		});
	});

	describe("override tag stripping", () => {
		test("strips inline override tags from dialogue text", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,{\b1}Bold text{\b0}`;
			const result = parseAss({ input });
			expect(result.captions[0].text).toBe("Bold text");
			expect(result.warnings.some((w) => w.includes("inline override tags"))).toBe(true);
		});

		test("converts \\\\N to newline", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Line one\\NLine two`;
			const result = parseAss({ input });
			expect(result.captions[0].text).toBe("Line one\nLine two");
		});

		test("converts \\\\h to non-breaking space", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello\\hWorld`;
			const result = parseAss({ input });
			expect(result.captions[0].text).toBe("Hello World");
		});
	});

	describe("empty input", () => {
		test("returns empty captions for empty string", () => {
			const result = parseAss({ input: "" });
			expect(result.captions).toEqual([]);
			expect(result.skippedCueCount).toBe(0);
			expect(result.warnings).toEqual([]);
		});

		test("returns empty captions for whitespace-only input", () => {
			const result = parseAss({ input: "   \n\n  " });
			expect(result.captions).toEqual([]);
		});
	});

	describe("alignment mapping", () => {
		test("maps ASS alignment 2 to center/bottom", () => {
			const result = parseAss({ input: MINIMAL_ASS });
			expect(result.captions[0].style?.textAlign).toBe("center");
			expect(result.captions[0].style?.placement?.verticalAlign).toBe("bottom");
		});

		test("maps ASS alignment 5 to center/middle", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Align 5`;
			const result = parseAss({ input });
			expect(result.captions[0].style?.textAlign).toBe("center");
			expect(result.captions[0].style?.placement?.verticalAlign).toBe("middle");
		});

		test("maps ASS alignment 9 to right/top", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,9,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Align 9`;
			const result = parseAss({ input });
			expect(result.captions[0].style?.textAlign).toBe("right");
			expect(result.captions[0].style?.placement?.verticalAlign).toBe("top");
		});
	});

	describe("non-dialogue events", () => {
		test("ignores non-dialogue events (Comment, etc.)", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Comment: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,This is a comment
Dialogue: 0,0:00:05.00,0:00:07.00,Default,,0,0,0,,Real dialogue`;
			const result = parseAss({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Real dialogue");
			expect(result.warnings.some((w) => w.includes("non-dialogue"))).toBe(true);
		});
	});

	describe("effects", () => {
		test("ignores event effects field", () => {
			const input = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,fade(200,200,Effect text`;
			const result = parseAss({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("200,Effect text");
			expect(result.warnings.some((w) => w.includes("effects"))).toBe(true);
		});
	});
});
