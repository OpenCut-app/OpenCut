import { describe, expect, test } from "bun:test";
import {
	frameRateToFloat,
	frameRatesEqual,
	floatToFrameRate,
} from "../utils";

describe("frameRateToFloat", () => {
	test("converts standard integer frame rates", () => {
		expect(frameRateToFloat({ numerator: 24, denominator: 1 })).toBe(24);
		expect(frameRateToFloat({ numerator: 30, denominator: 1 })).toBe(30);
		expect(frameRateToFloat({ numerator: 60, denominator: 1 })).toBe(60);
	});

	test("converts fractional frame rates", () => {
		const result = frameRateToFloat({ numerator: 24000, denominator: 1001 });
		expect(result).toBeCloseTo(23.976, 2);
	});

	test("converts NTSC 30fps", () => {
		const result = frameRateToFloat({ numerator: 30000, denominator: 1001 });
		expect(result).toBeCloseTo(29.97, 2);
	});

	test("handles 1 fps", () => {
		expect(frameRateToFloat({ numerator: 1, denominator: 1 })).toBe(1);
	});

	test("handles arbitrary fractions", () => {
		expect(frameRateToFloat({ numerator: 120, denominator: 2 })).toBe(60);
	});
});

describe("frameRatesEqual", () => {
	test("returns true for identical rates", () => {
		expect(
			frameRatesEqual({
				a: { numerator: 30, denominator: 1 },
				b: { numerator: 30, denominator: 1 },
			}),
		).toBe(true);
	});

	test("returns false for different rates", () => {
		expect(
			frameRatesEqual({
				a: { numerator: 30, denominator: 1 },
				b: { numerator: 60, denominator: 1 },
			}),
		).toBe(false);
	});

	test("returns false for same float but different fractions", () => {
		expect(
			frameRatesEqual({
				a: { numerator: 30, denominator: 1 },
				b: { numerator: 60, denominator: 2 },
			}),
		).toBe(false);
	});

	test("returns true for equal fractional rates", () => {
		expect(
			frameRatesEqual({
				a: { numerator: 24000, denominator: 1001 },
				b: { numerator: 24000, denominator: 1001 },
			}),
		).toBe(true);
	});
});

describe("floatToFrameRate", () => {
	test("maps standard integer fps to standard rates", () => {
		expect(floatToFrameRate(24)).toEqual({ numerator: 24, denominator: 1 });
		expect(floatToFrameRate(30)).toEqual({ numerator: 30, denominator: 1 });
		expect(floatToFrameRate(60)).toEqual({ numerator: 60, denominator: 1 });
	});

	test("maps NTSC-like fps to standard fractional rates", () => {
		const result = floatToFrameRate(23.976);
		expect(result.numerator).toBe(24000);
		expect(result.denominator).toBe(1001);
	});

	test("maps 29.97 to NTSC 30fps", () => {
		const result = floatToFrameRate(29.97);
		expect(result.numerator).toBe(30000);
		expect(result.denominator).toBe(1001);
	});

	test("handles arbitrary integer fps", () => {
		const result = floatToFrameRate(120);
		expect(result).toEqual({ numerator: 120, denominator: 1 });
	});

	test("reduces arbitrary fractional fps with GCD", () => {
		const result = floatToFrameRate(25);
		expect(result).toEqual({ numerator: 25, denominator: 1 });
	});

	test("handles 1 fps", () => {
		expect(floatToFrameRate(1)).toEqual({ numerator: 1, denominator: 1 });
	});

	test("handles fps with many decimal places", () => {
		const result = floatToFrameRate(29.97002997);
		// Should map to a standard rate or produce a reduced fraction
		expect(result.numerator).toBeGreaterThan(0);
		expect(result.denominator).toBeGreaterThan(0);
	});
});
