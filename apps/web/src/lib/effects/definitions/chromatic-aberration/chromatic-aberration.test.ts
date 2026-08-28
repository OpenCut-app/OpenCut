import { describe, test, expect } from "bun:test";
import { chromaticAberrationEffectDefinition } from "./index";
import { EffectCategory } from "@/lib/effects/categories";

describe("Chromatic Aberration Effect Definition", () => {
	test("has correct type and name", () => {
		expect(chromaticAberrationEffectDefinition.type).toBe(
			"chromatic-aberration",
		);
		expect(chromaticAberrationEffectDefinition.name).toBe(
			"Chromatic Aberration",
		);
	});

	test("is categorized as artistic", () => {
		expect(chromaticAberrationEffectDefinition.category).toBe(
			EffectCategory.ARTISTIC,
		);
	});

	test("has searchable keywords", () => {
		expect(chromaticAberrationEffectDefinition.keywords).toContain("chromatic");
		expect(chromaticAberrationEffectDefinition.keywords).toContain(
			"aberration",
		);
		expect(chromaticAberrationEffectDefinition.keywords).toContain("rgb split");
		expect(chromaticAberrationEffectDefinition.keywords).toContain("prism");
	});

	test("has 2 params: intensity and angle", () => {
		expect(
			chromaticAberrationEffectDefinition.params.map((p) => p.key),
		).toEqual(["intensity", "angle"]);
	});

	test("intensity param has correct defaults", () => {
		const param = chromaticAberrationEffectDefinition.params[0];
		expect(param.key).toBe("intensity");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(20);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("angle param has correct defaults", () => {
		const param = chromaticAberrationEffectDefinition.params[1];
		expect(param.key).toBe("angle");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(0);
			expect(param.min).toBe(0);
			expect(param.max).toBe(360);
			expect(param.step).toBe(1);
		}
	});

	test("renderer has single pass", () => {
		expect(chromaticAberrationEffectDefinition.renderer.type).toBe("webgl");
		expect(chromaticAberrationEffectDefinition.renderer.passes).toHaveLength(1);
	});

	test("uniforms scale intensity by factor of 10", () => {
		const pass = chromaticAberrationEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 0, angle: 0 },
			width: 1920,
			height: 1080,
		});
		const at100 = pass.uniforms({
			effectParams: { intensity: 100, angle: 0 },
			width: 1920,
			height: 1080,
		});
		expect(at0.u_intensity).toBe(0);
		expect(at100.u_intensity).toBe(10); // 100 / 10 = 10
	});

	test("uniforms convert angle from degrees to radians", () => {
		const pass = chromaticAberrationEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 50, angle: 0 },
			width: 1920,
			height: 1080,
		});
		const at90 = pass.uniforms({
			effectParams: { intensity: 50, angle: 90 },
			width: 1920,
			height: 1080,
		});
		const at180 = pass.uniforms({
			effectParams: { intensity: 50, angle: 180 },
			width: 1920,
			height: 1080,
		});
		const at360 = pass.uniforms({
			effectParams: { intensity: 50, angle: 360 },
			width: 1920,
			height: 1080,
		});
		expect(at0.u_angle).toBe(0);
		expect(at90.u_angle).toBeCloseTo(Math.PI / 2, 5);
		expect(at180.u_angle).toBeCloseTo(Math.PI, 5);
		expect(at360.u_angle).toBeCloseTo(2 * Math.PI, 5);
	});

	test("angle 45 degrees converts correctly", () => {
		const pass = chromaticAberrationEffectDefinition.renderer.passes[0];
		const result = pass.uniforms({
			effectParams: { intensity: 50, angle: 45 },
			width: 1920,
			height: 1080,
		});
		expect(result.u_angle).toBeCloseTo(Math.PI / 4, 5);
	});

	test("uniforms with default values", () => {
		const pass = chromaticAberrationEffectDefinition.renderer.passes[0];
		const result = pass.uniforms({
			effectParams: { intensity: 20, angle: 0 },
			width: 1920,
			height: 1080,
		});
		expect(result.u_intensity).toBe(2); // 20 / 10 = 2
		expect(result.u_angle).toBe(0);
	});
});
