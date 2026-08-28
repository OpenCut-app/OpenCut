import { describe, test, expect } from "bun:test";
import { glitchEffectDefinition } from "./index";
import { EffectCategory } from "@/lib/effects/categories";

describe("Glitch Effect Definition", () => {
	test("has correct type and name", () => {
		expect(glitchEffectDefinition.type).toBe("glitch");
		expect(glitchEffectDefinition.name).toBe("Glitch");
	});

	test("is categorized as artistic", () => {
		expect(glitchEffectDefinition.category).toBe(EffectCategory.ARTISTIC);
	});

	test("has searchable keywords", () => {
		expect(glitchEffectDefinition.keywords).toContain("glitch");
		expect(glitchEffectDefinition.keywords).toContain("digital");
		expect(glitchEffectDefinition.keywords).toContain("vhs");
		expect(glitchEffectDefinition.keywords).toContain("corrupt");
	});

	test("has 3 params: intensity, speed, colorSplit", () => {
		expect(glitchEffectDefinition.params.map((p) => p.key)).toEqual([
			"intensity",
			"speed",
			"colorSplit",
		]);
	});

	test("intensity param has correct defaults", () => {
		const param = glitchEffectDefinition.params[0];
		expect(param.key).toBe("intensity");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(50);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("speed param has correct defaults", () => {
		const param = glitchEffectDefinition.params[1];
		expect(param.key).toBe("speed");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(50);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("colorSplit param has correct defaults", () => {
		const param = glitchEffectDefinition.params[2];
		expect(param.key).toBe("colorSplit");
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(30);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("renderer has 2 passes (block displacement + scanlines)", () => {
		expect(glitchEffectDefinition.renderer.type).toBe("webgl");
		expect(glitchEffectDefinition.renderer.passes).toHaveLength(2);
	});

	test("pass 1 uniforms scale intensity correctly", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const result = pass1.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 1,
		});
		expect(result.u_intensity).toBe(0.05); // 50 / 1000 = 0.05
	});

	test("pass 1 colorSplit scales with width", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const at1920 = pass1.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 1,
		});
		const at3840 = pass1.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 3840,
			height: 2160,
			time: 1,
		});
		// colorSplit: 30 / (width * 10)
		expect(at1920.u_colorSplit).toBeCloseTo(30 / 19200, 6);
		expect(at3840.u_colorSplit).toBeCloseTo(30 / 38400, 6);
		// Higher resolution = smaller colorSplit value
		expect(at3840.u_colorSplit).toBeLessThan(at1920.u_colorSplit as number);
	});

	test("pass 1 time scales with speed", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const atSpeed0 = pass1.uniforms({
			effectParams: { intensity: 50, speed: 0, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 2,
		});
		const atSpeed50 = pass1.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 2,
		});
		const atSpeed100 = pass1.uniforms({
			effectParams: { intensity: 50, speed: 100, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 2,
		});
		// time * (speed / 50)
		expect(atSpeed0.u_time).toBe(0);
		expect(atSpeed50.u_time).toBe(2); // 2 * (50 / 50) = 2
		expect(atSpeed100.u_time).toBe(4); // 2 * (100 / 50) = 4
	});

	test("pass 2 uniforms scale intensity correctly", () => {
		const pass2 = glitchEffectDefinition.renderer.passes[1];
		const result = pass2.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 1,
		});
		expect(result.u_intensity).toBe(0.5); // 50 / 100 = 0.5
	});

	test("pass 2 time scales with speed", () => {
		const pass2 = glitchEffectDefinition.renderer.passes[1];
		const atSpeed25 = pass2.uniforms({
			effectParams: { intensity: 50, speed: 25, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 4,
		});
		expect(atSpeed25.u_time).toBe(2); // 4 * (25 / 50) = 2
	});

	test("both passes use time uniformly", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const pass2 = glitchEffectDefinition.renderer.passes[1];
		const params = { intensity: 50, speed: 50, colorSplit: 30 };
		const args = { effectParams: params, width: 1920, height: 1080, time: 3 };
		const result1 = pass1.uniforms(args);
		const result2 = pass2.uniforms(args);
		// Both passes should have the same time value when speed is 50
		expect(result1.u_time).toBe(3);
		expect(result2.u_time).toBe(3);
	});

	test("handles undefined time gracefully", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const result = pass1.uniforms({
			effectParams: { intensity: 50, speed: 50, colorSplit: 30 },
			width: 1920,
			height: 1080,
		});
		expect(result.u_time).toBe(0);
	});

	test("zero speed results in zero time", () => {
		const pass1 = glitchEffectDefinition.renderer.passes[0];
		const result = pass1.uniforms({
			effectParams: { intensity: 50, speed: 0, colorSplit: 30 },
			width: 1920,
			height: 1080,
			time: 100,
		});
		expect(result.u_time).toBe(0);
	});
});
