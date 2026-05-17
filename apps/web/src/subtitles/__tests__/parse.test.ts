import { describe, expect, test } from "bun:test";
import { parseSubtitleFile } from "../parse";

describe("parseSubtitleFile", () => {
	const SRT_INPUT = `1
00:00:01,000 --> 00:00:02,000
Hello`;

	const ASS_INPUT = `[Script Info]
ScriptType: v4.00+

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Hello`;

	test("dispatches .srt files to parseSrt", () => {
		const result = parseSubtitleFile({ fileName: "test.srt", input: SRT_INPUT });
		expect(result.captions).toHaveLength(1);
		expect(result.captions[0].text).toBe("Hello");
	});

	test("dispatches .ass files to parseAss", () => {
		const result = parseSubtitleFile({ fileName: "test.ass", input: ASS_INPUT });
		expect(result.captions).toHaveLength(1);
		expect(result.captions[0].text).toBe("Hello");
	});

	test("throws for unsupported extension .txt", () => {
		expect(() => parseSubtitleFile({ fileName: "test.txt", input: "some text" })).toThrow(
			"Unsupported subtitle format",
		);
	});

	test("throws for unsupported extension .vtt", () => {
		expect(() => parseSubtitleFile({ fileName: "test.vtt", input: "WEBVTT" })).toThrow(
			"Unsupported subtitle format",
		);
	});

	test("throws for unsupported extension .sub", () => {
		expect(() => parseSubtitleFile({ fileName: "test.sub", input: "" })).toThrow(
			"Unsupported subtitle format",
		);
	});

	test("matches extensions case-insensitively", () => {
		const result1 = parseSubtitleFile({ fileName: "test.SRT", input: SRT_INPUT });
		expect(result1.captions).toHaveLength(1);

		const result2 = parseSubtitleFile({ fileName: "test.ASS", input: ASS_INPUT });
		expect(result2.captions).toHaveLength(1);

		const result3 = parseSubtitleFile({ fileName: "test.Srt", input: SRT_INPUT });
		expect(result3.captions).toHaveLength(1);
	});

	test("handles filenames with multiple dots", () => {
		const result = parseSubtitleFile({ fileName: "my.project.v2.srt", input: SRT_INPUT });
		expect(result.captions).toHaveLength(1);
	});

	test("throws for file with no extension", () => {
		expect(() => parseSubtitleFile({ fileName: "noextension", input: SRT_INPUT })).toThrow(
			"Unsupported subtitle format",
		);
	});
});
