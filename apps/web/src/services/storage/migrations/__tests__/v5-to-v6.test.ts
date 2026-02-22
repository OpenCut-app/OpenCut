import { describe, expect, test } from "bun:test";
import { transformProjectV5ToV6 } from "../transformers/v5-to-v6";
import { v5Project } from "./fixtures";

describe("V5 to V6 Migration", () => {
	test("converts number bookmarks to Bookmark objects", async () => {
		const result = transformProjectV5ToV6({
			project: v5Project as Parameters<
				typeof transformProjectV5ToV6
			>[0]["project"],
		});

		expect(result.skipped).toBe(false);
		expect(result.project.version).toBe(6);

		const mainScene = (
			result.project.scenes as Array<{ bookmarks: unknown[] }>
		)[0];
		expect(mainScene.bookmarks).toEqual([
			{ time: 2.0 },
			{ time: 5.5 },
			{ time: 12.0 },
		]);

		const introScene = (
			result.project.scenes as Array<{ bookmarks: unknown[] }>
		)[1];
		expect(introScene.bookmarks).toEqual([]);
	});

	test("skips projects that are already v6", () => {
		const result = transformProjectV5ToV6({
			project: {
				...v5Project,
				version: 6,
				scenes: [
					{
						...(v5Project as { scenes: unknown[] }).scenes[0],
						bookmarks: [{ time: 2 }, { time: 5 }],
					},
				],
			} as Parameters<typeof transformProjectV5ToV6>[0]["project"],
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("already v6");
	});

	test("skips projects with no id", () => {
		const result = transformProjectV5ToV6({
			project: {
				version: 5,
				scenes: [],
			} as Parameters<typeof transformProjectV5ToV6>[0]["project"],
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("no project id");
	});

	test("preserves existing Bookmark objects with note, color, duration", () => {
		const projectWithRichBookmarks = {
			...v5Project,
			version: 5,
			scenes: [
				{
					...(v5Project as { scenes: Array<Record<string, unknown>> })
						.scenes[0],
					bookmarks: [
						{ time: 1, note: "Intro", color: "#ef4444" },
						{ time: 5.5, duration: 2 },
					],
				},
			],
		};

		const result = transformProjectV5ToV6({
			project: projectWithRichBookmarks as Parameters<
				typeof transformProjectV5ToV6
			>[0]["project"],
		});

		expect(result.skipped).toBe(false);
		const mainScene = (
			result.project.scenes as Array<{ bookmarks: unknown[] }>
		)[0];
		expect(mainScene.bookmarks).toEqual([
			{ time: 1, note: "Intro", color: "#ef4444" },
			{ time: 5.5, duration: 2 },
		]);
	});
});
