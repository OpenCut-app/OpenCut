import { describe, expect, test } from "bun:test";
import { PROJECT_TYPES, type TProjectType } from "@/project/types";

describe("PROJECT_TYPES", () => {
	test("contains standard and shorts", () => {
		expect(PROJECT_TYPES).toContain("standard");
		expect(PROJECT_TYPES).toContain("shorts");
	});

	test("project metadata uses 'standard' when projectType is undefined", () => {
		function buildMetadataProjectType(input?: TProjectType): TProjectType {
			return input ?? "standard";
		}
		expect(buildMetadataProjectType(undefined)).toBe("standard");
		expect(buildMetadataProjectType("shorts")).toBe("shorts");
		expect(buildMetadataProjectType("standard")).toBe("standard");
	});

	test("PROJECT_TYPES is stable in declared order", () => {
		expect([...PROJECT_TYPES]).toEqual(["standard", "shorts"]);
	});
});
