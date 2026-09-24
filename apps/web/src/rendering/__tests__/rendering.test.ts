import { describe, expect, test } from "bun:test";
import {
	buildTransformFromParams,
	readOpacityFromParams,
	readBlendModeFromParams,
} from "..";
import type { ParamValues } from "@/params";

describe("buildTransformFromParams", () => {
	test("returns default transform for empty params", () => {
		const result = buildTransformFromParams({ params: {} });
		expect(result).toEqual({
			scaleX: 1,
			scaleY: 1,
			position: { x: 0, y: 0 },
			rotate: 0,
		});
	});

	test("reads all transform values from params", () => {
		const params: ParamValues = {
			"transform.scaleX": 2,
			"transform.scaleY": 0.5,
			"transform.positionX": 100,
			"transform.positionY": -50,
			"transform.rotate": 45,
		};
		const result = buildTransformFromParams({ params });
		expect(result).toEqual({
			scaleX: 2,
			scaleY: 0.5,
			position: { x: 100, y: -50 },
			rotate: 45,
		});
	});

	test("uses defaults for missing transform keys", () => {
		const params: ParamValues = {
			"transform.scaleX": 3,
		};
		const result = buildTransformFromParams({ params });
		expect(result.scaleX).toBe(3);
		expect(result.scaleY).toBe(1);
		expect(result.position.x).toBe(0);
		expect(result.position.y).toBe(0);
		expect(result.rotate).toBe(0);
	});

	test("ignores non-number values and uses defaults", () => {
		const params: ParamValues = {
			"transform.scaleX": "invalid" as unknown as number,
			"transform.rotate": true as unknown as number,
		};
		const result = buildTransformFromParams({ params });
		expect(result.scaleX).toBe(1);
		expect(result.rotate).toBe(0);
	});

	test("handles zero values", () => {
		const params: ParamValues = {
			"transform.scaleX": 0,
			"transform.scaleY": 0,
			"transform.positionX": 0,
			"transform.positionY": 0,
			"transform.rotate": 0,
		};
		const result = buildTransformFromParams({ params });
		expect(result).toEqual({
			scaleX: 0,
			scaleY: 0,
			position: { x: 0, y: 0 },
			rotate: 0,
		});
	});

	test("handles negative values", () => {
		const params: ParamValues = {
			"transform.scaleX": -1,
			"transform.positionX": -200,
			"transform.rotate": -90,
		};
		const result = buildTransformFromParams({ params });
		expect(result.scaleX).toBe(-1);
		expect(result.position.x).toBe(-200);
		expect(result.rotate).toBe(-90);
	});
});

describe("readOpacityFromParams", () => {
	test("returns 1 for empty params", () => {
		expect(readOpacityFromParams({ params: {} })).toBe(1);
	});

	test("reads opacity from params", () => {
		expect(
			readOpacityFromParams({ params: { opacity: 0.5 } }),
		).toBe(0.5);
	});

	test("returns default for non-number opacity", () => {
		expect(
			readOpacityFromParams({ params: { opacity: "half" as unknown as number } }),
		).toBe(1);
	});

	test("handles zero opacity", () => {
		expect(
			readOpacityFromParams({ params: { opacity: 0 } }),
		).toBe(0);
	});
});

describe("readBlendModeFromParams", () => {
	test("returns 'normal' for empty params", () => {
		expect(readBlendModeFromParams({ params: {} })).toBe("normal");
	});

	test("returns 'normal' for non-string blend mode", () => {
		expect(
			readBlendModeFromParams({ params: { blendMode: 123 as unknown as string } }),
		).toBe("normal");
	});

	test("reads valid blend modes", () => {
		expect(
			readBlendModeFromParams({ params: { blendMode: "multiply" } }),
		).toBe("multiply");
		expect(
			readBlendModeFromParams({ params: { blendMode: "screen" } }),
		).toBe("screen");
		expect(
			readBlendModeFromParams({ params: { blendMode: "overlay" } }),
		).toBe("overlay");
	});

	test("returns 'normal' for invalid blend mode string", () => {
		expect(
			readBlendModeFromParams({ params: { blendMode: "invalid-mode" } }),
		).toBe("normal");
	});

	test("reads all valid blend modes", () => {
		const validModes = [
			"normal", "darken", "multiply", "color-burn", "lighten", "screen",
			"plus-lighter", "color-dodge", "overlay", "soft-light", "hard-light",
			"difference", "exclusion", "hue", "saturation", "color", "luminosity",
		];
		for (const mode of validModes) {
			expect(
				readBlendModeFromParams({ params: { blendMode: mode } }),
			).toBe(mode);
		}
	});
});
