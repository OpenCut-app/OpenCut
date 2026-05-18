import { describe, expect, test } from "bun:test";
import {
	EXPORT_PRESETS,
	EXPORT_PRESET_IDS,
	YOUTUBE_SHORTS_EXPORT_PRESET,
	getExportPresetById,
} from "@/export";
import {
	DEFAULT_EXPORT_OPTIONS,
	getDefaultExportOptions,
} from "@/export/defaults";

describe("YOUTUBE_SHORTS_EXPORT_PRESET", () => {
	test("has the expected encoding shape", () => {
		expect(YOUTUBE_SHORTS_EXPORT_PRESET.options).toMatchObject({
			format: "mp4",
			quality: "very_high",
			includeAudio: true,
		});
	});

	test("has descriptive label and description", () => {
		expect(YOUTUBE_SHORTS_EXPORT_PRESET.label).toMatch(/\S/);
		expect(YOUTUBE_SHORTS_EXPORT_PRESET.description).toMatch(/\S/);
	});
});

describe("EXPORT_PRESETS registry", () => {
	test("contains youtube-shorts", () => {
		const ids = EXPORT_PRESETS.map((p) => p.id);
		expect(ids).toContain("youtube-shorts");
	});

	test("every registered preset's id is in EXPORT_PRESET_IDS", () => {
		for (const preset of EXPORT_PRESETS) {
			expect(EXPORT_PRESET_IDS).toContain(preset.id);
		}
	});

	test("getExportPresetById resolves youtube-shorts", () => {
		const preset = getExportPresetById({ id: "youtube-shorts" });
		expect(preset).toBeDefined();
		expect(preset?.id).toBe("youtube-shorts");
	});


});

describe("getDefaultExportOptions", () => {
	test("returns Shorts preset options when projectType is shorts", () => {
		const opts = getDefaultExportOptions({ projectType: "shorts" });
		expect(opts).toEqual(YOUTUBE_SHORTS_EXPORT_PRESET.options);
	});

	test("returns DEFAULT_EXPORT_OPTIONS when projectType is standard", () => {
		const opts = getDefaultExportOptions({ projectType: "standard" });
		expect(opts).toEqual(DEFAULT_EXPORT_OPTIONS);
	});

	test("returns DEFAULT_EXPORT_OPTIONS when projectType is undefined", () => {
		const opts = getDefaultExportOptions({});
		expect(opts).toEqual(DEFAULT_EXPORT_OPTIONS);
	});
});
