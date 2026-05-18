import { describe, expect, test } from "bun:test";
import {
	DEFAULT_CANVAS_PRESETS,
	DEFAULT_CANVAS_SIZE,
	NAMED_CANVAS_PRESETS,
	SHORTS_CANVAS_PRESET,
} from "@/canvas/sizes";

describe("NAMED_CANVAS_PRESETS", () => {
	test("has the four canonical presets in declared order", () => {
		const ids = NAMED_CANVAS_PRESETS.map((p) => p.id);
		expect(ids).toEqual([
			"landscape-1080p",
			"shorts-1080x1920",
			"square-1080",
			"landscape-1440",
		]);
	});

	test("every preset has consistent shape", () => {
		for (const preset of NAMED_CANVAS_PRESETS) {
			expect(preset.id.length).toBeGreaterThan(0);
			expect(preset.label.length).toBeGreaterThan(0);
			expect(preset.size.width).toBeGreaterThan(0);
			expect(preset.size.height).toBeGreaterThan(0);
			expect(preset.aspectRatio).toMatch(/^\d+:\d+$/);
		}
	});
});

describe("SHORTS_CANVAS_PRESET", () => {
	test("is 1080x1920 vertical 9:16", () => {
		expect(SHORTS_CANVAS_PRESET.size).toEqual({ width: 1080, height: 1920 });
		expect(SHORTS_CANVAS_PRESET.aspectRatio).toBe("9:16");
		expect(SHORTS_CANVAS_PRESET.projectType).toBe("shorts");
	});
});

describe("DEFAULT_CANVAS_PRESETS (back-compat)", () => {
	test("derives from NAMED_CANVAS_PRESETS in order", () => {
		expect(DEFAULT_CANVAS_PRESETS).toEqual(
			NAMED_CANVAS_PRESETS.map((p) => p.size),
		);
	});

	test("contains the Shorts preset 1080x1920", () => {
		expect(DEFAULT_CANVAS_PRESETS).toContainEqual({
			width: 1080,
			height: 1920,
		});
	});
});

describe("DEFAULT_CANVAS_SIZE", () => {
	test("remains 1920x1080 (landscape default)", () => {
		expect(DEFAULT_CANVAS_SIZE).toEqual({ width: 1920, height: 1080 });
	});
});
