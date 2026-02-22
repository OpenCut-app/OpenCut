import { describe, expect, test } from "bun:test";
import { transformProjectV3ToV4 } from "../transformers/v3-to-v4";
import { v3Project } from "./fixtures";

describe("V3 to V4 Migration", () => {
	test("normalizes legacy text fontWeight values", () => {
		const projectWithLegacyTextWeight = {
			...v3Project,
			scenes: [
				{
					...v3Project.scenes[0],
					tracks: [
						{
							id: "track-text",
							type: "text",
							name: "Text Track",
							hidden: false,
							elements: [
								{
									id: "text-1",
									type: "text",
									name: "Title",
									content: "Hello",
									duration: 5,
									startTime: 0,
									trimStart: 0,
									trimEnd: 0,
									fontSize: 64,
									fontFamily: "Inter",
									color: "#ffffff",
									backgroundColor: "transparent",
									textAlign: "center",
									fontWeight: "bold",
									fontStyle: "normal",
									textDecoration: "none",
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

		const result = transformProjectV3ToV4({
			project: projectWithLegacyTextWeight,
		});

		expect(result.skipped).toBe(false);
		expect(result.project.version).toBe(4);

		const migratedScene = (
			result.project.scenes as Array<Record<string, unknown>>
		)[0];
		const migratedTrack = (
			migratedScene.tracks as Array<Record<string, unknown>>
		)[0];
		const migratedElement = (
			migratedTrack.elements as Array<Record<string, unknown>>
		)[0];

		expect(migratedElement.fontWeight).toBe("700");
	});

	test("does not mutate non-text tracks", () => {
		const projectWithoutTextTrack = {
			...v3Project,
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
									iconName: "mdi:home",
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

		const result = transformProjectV3ToV4({ project: projectWithoutTextTrack });
		const migratedScene = (
			result.project.scenes as Array<Record<string, unknown>>
		)[0];
		const migratedTrack = (
			migratedScene.tracks as Array<Record<string, unknown>>
		)[0];
		const migratedElement = (
			migratedTrack.elements as Array<Record<string, unknown>>
		)[0];

		expect(migratedElement.iconName).toBe("mdi:home");
	});

	test("skips projects that are already v4", () => {
		const result = transformProjectV3ToV4({
			project: { ...v3Project, version: 4 },
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("already v4");
	});

	test("skips projects with no id", () => {
		const result = transformProjectV3ToV4({
			project: {
				version: 3,
				scenes: [],
			},
		});

		expect(result.skipped).toBe(true);
		expect(result.reason).toBe("no project id");
	});
});
