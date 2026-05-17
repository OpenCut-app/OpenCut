import { describe, expect, test } from "bun:test";
import { parseSrt } from "../srt";

describe("parseSrt", () => {
	describe("basic parsing", () => {
		test("parses multiple cues with standard format", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000
Hello

2
00:00:03,000 --> 00:00:05,000
World`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(2);
			expect(result.captions[0]).toEqual({
				text: "Hello",
				startTime: 1,
				duration: 1,
			});
			expect(result.captions[1]).toEqual({
				text: "World",
				startTime: 3,
				duration: 2,
			});
			expect(result.skippedCueCount).toBe(0);
			expect(result.warnings).toEqual([]);
		});
	});

	describe("timestamp formats", () => {
		test("parses HH:MM:SS,mmm timestamps (comma separator)", () => {
			const input = `1
00:01:30,500 --> 00:01:31,750
Test`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(90.5);
			expect(result.captions[0].duration).toBeCloseTo(1.25);
		});

		test("parses HH:MM:SS.mmm timestamps (dot separator)", () => {
			const input = `1
00:01:30.500 --> 00:01:31.750
Test`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(90.5);
			expect(result.captions[0].duration).toBeCloseTo(1.25);
		});

		test("handles mixed comma and dot separators", () => {
			const input = `1
00:00:01,000 --> 00:00:02.500
Mixed`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(1);
			expect(result.captions[0].duration).toBeCloseTo(1.5);
		});

		test("handles 1-digit millisecond values", () => {
			const input = `1
00:00:01,5 --> 00:00:02,0
Short ms`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(1.5);
			expect(result.captions[0].duration).toBeCloseTo(0.5);
		});

		test("handles 2-digit millisecond values", () => {
			const input = `1
00:00:01,50 --> 00:00:02,00
Two digit ms`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(1.5);
		});
	});

	describe("multi-line text", () => {
		test("parses multi-line cue text", () => {
			const input = `1
00:00:01,000 --> 00:00:05,000
Line one
Line two
Line three`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Line one\nLine two\nLine three");
		});
	});

	describe("sequence numbers", () => {
		test("parses cues with sequence numbers", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000
First

42
00:00:03,000 --> 00:00:04,000
Second`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(2);
		});

		test("parses cues without sequence numbers (timestamp on first line)", () => {
			const input = `00:00:01,000 --> 00:00:02,000
No sequence number`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("No sequence number");
		});
	});

	describe("empty input", () => {
		test("returns empty captions for empty string", () => {
			const result = parseSrt({ input: "" });
			expect(result.captions).toEqual([]);
			expect(result.skippedCueCount).toBe(0);
			expect(result.warnings).toEqual([]);
		});

		test("returns empty captions for whitespace-only input", () => {
			const result = parseSrt({ input: "   \n\n  " });
			expect(result.captions).toEqual([]);
			expect(result.skippedCueCount).toBe(0);
		});
	});

	describe("malformed blocks", () => {
		test("skips block with missing timestamp line", () => {
			const input = `1
No timestamp here

2
00:00:01,000 --> 00:00:02,000
Valid`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Valid");
			expect(result.skippedCueCount).toBeGreaterThanOrEqual(1);
		});

		test("skips block with bad timestamp format", () => {
			const input = `1
00:00:01 --> 00:00:02
Missing milliseconds`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(0);
			expect(result.skippedCueCount).toBeGreaterThanOrEqual(1);
		});

		test("skips block with only one line", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000
Valid

Orphan line`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Valid");
		});

		test("skips block with empty text after timestamp", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000

2
00:00:03,000 --> 00:00:04,000
Has text`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Has text");
			expect(result.skippedCueCount).toBeGreaterThanOrEqual(1);
		});
	});

	describe("non-positive duration", () => {
		test("skips cue where end equals start (zero duration)", () => {
			const input = `1
00:00:01,000 --> 00:00:01,000
Zero duration

2
00:00:05,000 --> 00:00:06,000
Valid`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Valid");
			expect(result.skippedCueCount).toBeGreaterThanOrEqual(1);
		});

		test("skips cue where end is before start (negative duration)", () => {
			const input = `1
00:00:05,000 --> 00:00:03,000
Negative duration`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(0);
			expect(result.skippedCueCount).toBeGreaterThanOrEqual(1);
		});
	});

	describe("line ending normalization", () => {
		test("handles \\r\\n line endings", () => {
			const input = "1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nWorld";
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(2);
			expect(result.captions[0].text).toBe("Hello");
			expect(result.captions[1].text).toBe("World");
		});

		test("handles \\r line endings (classic Mac)", () => {
			const input = "1\r00:00:01,000 --> 00:00:02,000\rHello\r\r2\r00:00:03,000 --> 00:00:04,000\rWorld";
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(2);
			expect(result.captions[0].text).toBe("Hello");
			expect(result.captions[1].text).toBe("World");
		});
	});

	describe("whitespace handling", () => {
		test("trims leading/trailing whitespace from cue text", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000
   Padded text   `;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].text).toBe("Padded text");
		});

		test("handles extra blank lines between cues", () => {
			const input = `1
00:00:01,000 --> 00:00:02,000
First


2
00:00:03,000 --> 00:00:04,000
Second`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(2);
		});

		test("handles whitespace in timestamp arrows", () => {
			const input = `1
00:00:01,000  -->  00:00:02,000
Spaced arrow`;
			const result = parseSrt({ input });
			expect(result.captions).toHaveLength(1);
			expect(result.captions[0].startTime).toBe(1);
		});
	});
});
