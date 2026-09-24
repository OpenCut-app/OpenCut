import { describe, expect, test } from "bun:test";
import {
	clamp,
	clampRound,
	getFractionDigitsForStep,
	snapToStep,
	isNearlyEqual,
	formatNumberForDisplay,
} from "../math";

describe("clamp", () => {
	test("returns value when within range", () => {
		expect(clamp({ value: 5, min: 0, max: 10 })).toBe(5);
	});

	test("clamps to min when value is below range", () => {
		expect(clamp({ value: -5, min: 0, max: 10 })).toBe(0);
	});

	test("clamps to max when value is above range", () => {
		expect(clamp({ value: 15, min: 0, max: 10 })).toBe(10);
	});

	test("returns min when value equals min", () => {
		expect(clamp({ value: 0, min: 0, max: 10 })).toBe(0);
	});

	test("returns max when value equals max", () => {
		expect(clamp({ value: 10, min: 0, max: 10 })).toBe(10);
	});

	test("works with negative ranges", () => {
		expect(clamp({ value: 0, min: -10, max: -1 })).toBe(-1);
		expect(clamp({ value: -15, min: -10, max: -1 })).toBe(-10);
	});

	test("handles min > max (returns min)", () => {
		expect(clamp({ value: 5, min: 10, max: 0 })).toBe(10);
	});
});

describe("clampRound", () => {
	test("rounds then clamps value within range", () => {
		expect(clampRound({ value: 5.6, min: 0, max: 10 })).toBe(6);
		expect(clampRound({ value: 5.4, min: 0, max: 10 })).toBe(5);
	});

	test("clamps after rounding", () => {
		expect(clampRound({ value: 9.7, min: 0, max: 10 })).toBe(10);
		expect(clampRound({ value: 0.3, min: 0, max: 10 })).toBe(0);
	});

	test("handles values already at boundaries", () => {
		expect(clampRound({ value: 0, min: 0, max: 10 })).toBe(0);
		expect(clampRound({ value: 10, min: 0, max: 10 })).toBe(10);
	});

	test("rounds negative values correctly", () => {
		expect(clampRound({ value: -0.4, min: -10, max: 10 })).toBeCloseTo(0);
		expect(clampRound({ value: -0.6, min: -10, max: 10 })).toBe(-1);
	});
});

describe("getFractionDigitsForStep", () => {
	test("returns 0 for integer step", () => {
		expect(getFractionDigitsForStep({ step: 1 })).toBe(0);
		expect(getFractionDigitsForStep({ step: 10 })).toBe(0);
		expect(getFractionDigitsForStep({ step: 100 })).toBe(0);
	});

	test("returns correct digits for decimal step", () => {
		expect(getFractionDigitsForStep({ step: 0.1 })).toBe(1);
		expect(getFractionDigitsForStep({ step: 0.01 })).toBe(2);
		expect(getFractionDigitsForStep({ step: 0.001 })).toBe(3);
		expect(getFractionDigitsForStep({ step: 0.5 })).toBe(1);
		expect(getFractionDigitsForStep({ step: 0.25 })).toBe(2);
	});

	test("handles scientific notation", () => {
		expect(getFractionDigitsForStep({ step: 1e-2 })).toBe(2);
		expect(getFractionDigitsForStep({ step: 1e-3 })).toBe(3);
		expect(getFractionDigitsForStep({ step: 1e-6 })).toBe(6);
	});
});

describe("snapToStep", () => {
	test("snaps value to nearest step", () => {
		// Math.round(1.3/0.5)*0.5 = Math.round(2.6)*0.5 = 3*0.5 = 1.5
		expect(snapToStep({ value: 1.3, step: 0.5 })).toBe(1.5);
		// Math.round(1.2/0.5)*0.5 = Math.round(2.4)*0.5 = 2*0.5 = 1.0
		expect(snapToStep({ value: 1.2, step: 0.5 })).toBe(1.0);
		// Math.round(0.12/0.25)*0.25 = Math.round(0.48)*0.25 = 0*0.25 = 0
		expect(snapToStep({ value: 0.12, step: 0.25 })).toBe(0);
		// Math.round(7/3)*3 = Math.round(2.333)*3 = 2*3 = 6
		expect(snapToStep({ value: 7, step: 3 })).toBe(6);
		// Math.round(8/3)*3 = Math.round(2.667)*3 = 3*3 = 9
		expect(snapToStep({ value: 8, step: 3 })).toBe(9);
	});

	test("snaps integer steps correctly", () => {
		expect(snapToStep({ value: 3.7, step: 1 })).toBe(4);
		expect(snapToStep({ value: 3.2, step: 1 })).toBe(3);
	});

	test("returns value unchanged when step is 0", () => {
		expect(snapToStep({ value: 1.234, step: 0 })).toBe(1.234);
		expect(snapToStep({ value: -5.5, step: 0 })).toBe(-5.5);
	});

	test("returns value unchanged when step is negative", () => {
		expect(snapToStep({ value: 1.234, step: -1 })).toBe(1.234);
	});

	test("handles value exactly on step boundary", () => {
		expect(snapToStep({ value: 1.0, step: 0.5 })).toBe(1.0);
		expect(snapToStep({ value: 3, step: 3 })).toBe(3);
	});

	test("handles negative values", () => {
		// Math.round(-0.12/0.25)*0.25 = Math.round(-0.48)*0.25 = 0*0.25 = 0
		expect(snapToStep({ value: -0.12, step: 0.25 })).toBe(0);
		// Math.round(-0.37/0.25)*0.25 = Math.round(-1.48)*0.25 = -1*0.25 = -0.25
		expect(snapToStep({ value: -0.37, step: 0.25 })).toBe(-0.25);
		// Math.round(-1.3/0.5)*0.5 = Math.round(-2.6)*0.5 = -3*0.5 = -1.5
		expect(snapToStep({ value: -1.3, step: 0.5 })).toBe(-1.5);
	});
});

describe("isNearlyEqual", () => {
	test("returns true for equal values", () => {
		expect(isNearlyEqual({ leftValue: 1, rightValue: 1 })).toBe(true);
	});

	test("returns true for values within default epsilon", () => {
		expect(isNearlyEqual({ leftValue: 1.0, rightValue: 1.00005 })).toBe(true);
	});

	test("returns false for values outside default epsilon", () => {
		expect(isNearlyEqual({ leftValue: 1.0, rightValue: 1.1 })).toBe(false);
	});

	test("respects custom epsilon", () => {
		expect(isNearlyEqual({ leftValue: 1.0, rightValue: 1.05, epsilon: 0.1 })).toBe(true);
		expect(isNearlyEqual({ leftValue: 1.0, rightValue: 1.05, epsilon: 0.01 })).toBe(false);
	});

	test("handles negative values", () => {
		expect(isNearlyEqual({ leftValue: -1.0, rightValue: -1.0 })).toBe(true);
		expect(isNearlyEqual({ leftValue: -1.0, rightValue: -1.00005 })).toBe(true);
	});

	test("handles zero values", () => {
		expect(isNearlyEqual({ leftValue: 0, rightValue: 0 })).toBe(true);
		expect(isNearlyEqual({ leftValue: 0, rightValue: 0.00005 })).toBe(true);
	});
});

describe("formatNumberForDisplay", () => {
	test("formats integer values", () => {
		expect(formatNumberForDisplay({ value: 42 })).toBe("42");
		expect(formatNumberForDisplay({ value: 0 })).toBe("0");
	});

	test("formats decimal values and strips trailing zeros", () => {
		expect(formatNumberForDisplay({ value: 1.5 })).toBe("1.5");
		expect(formatNumberForDisplay({ value: 1.1 })).toBe("1.1");
	});

	test("strips trailing zeros from fixed decimals", () => {
		expect(formatNumberForDisplay({ value: 1.1 })).toBe("1.1");
		expect(formatNumberForDisplay({ value: 1.0 })).toBe("1");
	});

	test("respects fractionDigits parameter", () => {
		expect(formatNumberForDisplay({ value: 1.23456, fractionDigits: 2 })).toBe("1.23");
		// fractionDigits=3, maxFraction=3, minFraction=3, so trailing zeros preserved
		expect(formatNumberForDisplay({ value: 1.5, fractionDigits: 3 })).toBe("1.500");
	});

	test("respects minFractionDigits", () => {
		// minFractionDigits=2 means at least 2 decimal places kept
		expect(formatNumberForDisplay({ value: 1, minFractionDigits: 2 })).toBe("1.00");
		expect(formatNumberForDisplay({ value: 1.5, minFractionDigits: 3 })).toBe("1.500");
	});

	test("respects maxFractionDigits", () => {
		expect(formatNumberForDisplay({ value: 1.123456789, maxFractionDigits: 3 })).toBe("1.123");
	});

	test("handles negative numbers", () => {
		expect(formatNumberForDisplay({ value: -42 })).toBe("-42");
		expect(formatNumberForDisplay({ value: -1.5 })).toBe("-1.5");
	});

	test("handles zero with fraction digits", () => {
		// fractionDigits=2 → maxFrac=2, minFrac=2, so "0.00" not "0"
		expect(formatNumberForDisplay({ value: 0, fractionDigits: 2 })).toBe("0.00");
		expect(formatNumberForDisplay({ value: 0, minFractionDigits: 2 })).toBe("0.00");
	});

	test("fractionDigits overrides min and max", () => {
		expect(
			formatNumberForDisplay({
				value: 1.23456,
				fractionDigits: 2,
				minFractionDigits: 4,
				maxFractionDigits: 6,
			}),
		).toBe("1.23");
	});
});
