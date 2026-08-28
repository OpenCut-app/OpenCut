import { describe, test, expect } from "bun:test";
import { vignetteEffectDefinition } from "./index";
import { EffectCategory } from "@/lib/effects/categories";

describe("Vignette Effect Definition", () => {
	test("has correct type and name", () => {
		expect(vignetteEffectDefinition.type).toBe("vignette");
		expect(vignetteEffectDefinition.name).toBe("Vignette");
	});

	test("is categorized as artistic", () => {
		expect(vignetteEffectDefinition.category).toBe(EffectCategory.ARTISTIC);
	});

	test("has searchable keywords", () => {
		expect(vignetteEffectDefinition.keywords).toContain("vignette");
		expect(vignetteEffectDefinition.keywords).toContain("cinematic");
		expect(vignetteEffectDefinition.keywords).toContain("edges");
	});

	test("has 3 params: intensity, radius, softness", () => {
		expect(vignetteEffectDefinition.params.map((p) => p.key)).toEqual([
			"intensity",
			"radius",
			"softness",
		]);
	});

	test("intensity param has correct defaults", () => {
		const param = vignetteEffectDefinition.params[0];
		expect(param.key).toBe("intensity");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(50);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("radius param has correct defaults", () => {
		const param = vignetteEffectDefinition.params[1];
		expect(param.key).toBe("radius");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(80);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("softness param has correct defaults", () => {
		const param = vignetteEffectDefinition.params[2];
		expect(param.key).toBe("softness");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(50);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("renderer has single pass", () => {
		expect(vignetteEffectDefinition.renderer.type).toBe("webgl");
		expect(vignetteEffectDefinition.renderer.passes).toHaveLength(1);
	});

	test("uniforms normalize intensity to 0..1 range", () => {
		const pass = vignetteEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 0, radius: 50, softness: 50 },
			width: 1920,
			height: 1080,
		});
		const at100 = pass.uniforms({
			effectParams: { intensity: 100, radius: 50, softness: 50 },
			width: 1920,
			height: 1080,
		});
		expect(at0.u_intensity).toBe(0);
		expect(at100.u_intensity).toBe(1);
	});

	test("uniforms scale radius correctly", () => {
		const pass = vignetteEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 50, radius: 0, softness: 50 },
			width: 1920,
			height: 1080,
		});
		const at100 = pass.uniforms({
			effectParams: { intensity: 50, radius: 100, softness: 50 },
			width: 1920,
			height: 1080,
		});
		// radius: 100 / 100 * 0.707 = 0.707
		expect(at0.u_radius).toBe(0);
		expect(at100.u_radius).toBeCloseTo(Math.SQRT1_2, 3);
	});

	test("uniforms scale softness correctly", () => {
		const pass = vignetteEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 50, radius: 50, softness: 0 },
			width: 1920,
			height: 1080,
		});
		const at100 = pass.uniforms({
			effectParams: { intensity: 50, radius: 50, softness: 100 },
			width: 1920,
			height: 1080,
		});
		// softness: 100 / 100 * 0.5 = 0.5
		expect(at0.u_softness).toBe(0);
		expect(at100.u_softness).toBe(0.5);
	});

	test("uniforms with default values", () => {
		const pass = vignetteEffectDefinition.renderer.passes[0];
		const result = pass.uniforms({
			effectParams: { intensity: 50, radius: 80, softness: 50 },
			width: 1920,
			height: 1080,
		});
		expect(result.u_intensity).toBe(0.5);
		expect(result.u_radius).toBeCloseTo(0.5656, 3); // 80 / 100 * 0.707
		expect(result.u_softness).toBe(0.25); // 50 / 100 * 0.5
	});
});
