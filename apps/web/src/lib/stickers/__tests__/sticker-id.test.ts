import { describe, expect, test } from "bun:test";
import { buildStickerId, parseStickerId } from "../sticker-id";

describe("sticker-id strict mode", () => {
	test("parses provider-prefixed IDs", () => {
		expect(parseStickerId({ stickerId: "icons:mdi:home" })).toEqual({
			providerId: "icons",
			providerValue: "mdi:home",
		});
		expect(parseStickerId({ stickerId: "emoji:noto:grinning-face" })).toEqual({
			providerId: "emoji",
			providerValue: "noto:grinning-face",
		});
	});

	test("throws for IDs without provider prefix", () => {
		expect(() => parseStickerId({ stickerId: "home" })).toThrow();
	});

	test("throws for malformed IDs", () => {
		expect(() => parseStickerId({ stickerId: "" })).toThrow();
		expect(() => parseStickerId({ stickerId: "icons:" })).toThrow();
		expect(() => parseStickerId({ stickerId: ":mdi:home" })).toThrow();
	});

	test("builds sticker IDs unchanged", () => {
		expect(
			buildStickerId({
				providerId: "flags",
				providerValue: "US",
			}),
		).toBe("flags:US");
	});
});
