import { describe, expect, test } from "bun:test";
import { transformProjectV4ToV5 } from "../transformers/v4-to-v5";
import { v3Project } from "./fixtures";

describe("V4 to V5 Migration", () => {
	test("migrates sticker iconName to stickerId and removes legacy color", () => {
		const projectWithLegacySticker = {
			...v3Project,
			version: 4,
			scenes: [
				{
					...v3Project.scenes[0],
					tracks: [
						{
							id: "track-sticker",
							type: "sticker",
							name: "Sticker Track",
							hidden: false,
							elements: [
								{
									id: "sticker-1",
									type: "sticker",
									name: "Home",
									iconName: "mdi:home",
									color: "#ff0000",
									duration: 5,
									startTime: 0,
									trimStart: 0,
									trimEnd: 0,
									transform: {
										scale: 1,
										position: { x: 0, y: 0 },
										rotate: 0,
									},
									opacity: 1,
								},
							],
						},
					],
				},
			],
		};

		const result = transformProjectV4ToV5({
			project: projectWithLegacySticker,
		});

		expect(result.skipped).toBe(false);
		expect(result.project.version).toBe(5);

		const migratedScene = (
			result.project.scenes as Array<Record<string, unknown>>
		)[0];
		const migratedTrack = (
			migratedScene.tracks as Array<Record<string, unknown>>
		)[0];
		const migratedElement = (
			migratedTrack.elements as Array<Record<string, unknown>>
		)[0];

		expect(migratedElement.stickerId).toBe("icons:mdi:home");
		expect("iconName" in migratedElement).toBe(false);
		expect("color" in migratedElement).toBe(false);
	});

	test("keeps provider-prefixed stickerId values unchanged", () => {
		const projectWithStickerId = {
			...v3Project,
			version: 4,
			scenes: [
				{
					...v3Project.scenes[0],
					tracks: [
						{
							id: "track-sticker",
							type: "sticker",
							name: "Sticker Track",
							hidden: false,
							elements: [
								{
									id: "sticker-1",
									type: "sticker",
									name: "Flag",
									stickerId: "flags:AD",
									duration: 5,
									startTime: 0,
									trimStart: 0,
									trimEnd: 0,
									transform: {
										scale: 1,
										position: { x: 0, y: 0 },
										rotate: 0,
									},
									opacity: 1,
								},
							],
						},
					],
				},
			],
		};

		const result = transformProjectV4ToV5({ project: projectWithStickerId });
		const migratedScene = (
			result.project.scenes as Array<Record<string, unknown>>
		)[0];
		const migratedTrack = (
			migratedScene.tracks as Array<Record<string, unknown>>
		)[0];
		const migratedElement = (
			migratedTrack.elements as Array<Record<string, unknown>>
		)[0];

		expect(migratedElement.stickerId).toBe("flags:AD");
	});

	test("skips projects that are already v5", () => {
		const result = transformProjectV4ToV5({
			project: { ...v3Project, version: 5 },
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("already v5");
	});

	test("skips projects with no id", () => {
		const result = transformProjectV4ToV5({
			project: {
				version: 4,
				scenes: [],
			},
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("no project id");
	});
});
