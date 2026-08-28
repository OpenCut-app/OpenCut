import { describe, test, expect } from "bun:test";
import { sharpenEffectDefinition } from "./index";
import { EffectCategory } from "@/lib/effects/categories";

describe("Sharpen Effect Definition", () => {
	test("has correct type and name", () => {
		expect(sharpenEffectDefinition.type).toBe("sharpen");
		expect(sharpenEffectDefinition.name).toBe("Sharpen");
	});

	test("is categorized as artistic", () => {
		expect(sharpenEffectDefinition.category).toBe(EffectCategory.ARTISTIC);
	});

	test("has searchable keywords", () => {
		expect(sharpenEffectDefinition.keywords).toContain("sharpen");
		expect(sharpenEffectDefinition.keywords).toContain("crisp");
		expect(sharpenEffectDefinition.keywords).toContain("detail");
		expect(sharpenEffectDefinition.keywords).toContain("unsharp mask");
	});

	test("has single intensity param", () => {
		expect(sharpenEffectDefinition.params).toHaveLength(1);
		expect(sharpenEffectDefinition.params[0].key).toBe("intensity");
	});

	test("intensity param has correct defaults", () => {
		const param = sharpenEffectDefinition.params[0];
		expect(param.type).toBe("number");
		if (param.type === "number") {
			expect(param.default).toBe(50);
			expect(param.min).toBe(0);
			expect(param.max).toBe(100);
			expect(param.step).toBe(1);
		}
	});

	test("renderer has single pass", () => {
		expect(sharpenEffectDefinition.renderer.type).toBe("webgl");
		expect(sharpenEffectDefinition.renderer.passes).toHaveLength(1);
	});

	test("uniforms normalize intensity to 0..1 range", () => {
		const pass = sharpenEffectDefinition.renderer.passes[0];
		const at0 = pass.uniforms({
			effectParams: { intensity: 0 },
			width: 1920,
			height: 1080,
		});
		const at100 = pass.uniforms({
			effectParams: { intensity: 100 },
			width: 1920,
			height: 1080,
		});
		expect(at0.u_intensity).toBe(0);
		expect(at100.u_intensity).toBe(1);
	});

	test("uniforms at 50% intensity", () => {
		const pass = sharpenEffectDefinition.renderer.passes[0];
		const result = pass.uniforms({
			effectParams: { intensity: 50 },
			width: 1920,
			height: 1080,
		});
		expect(result.u_intensity).toBe(0.5);
	});

	test("uniforms at various intensity levels", () => {
		const pass = sharpenEffectDefinition.renderer.passes[0];
		const at25 = pass.uniforms({
			effectParams: { intensity: 25 },
			width: 1920,
			height: 1080,
		});
		const at75 = pass.uniforms({
			effectParams: { intensity: 75 },
			width: 1920,
			height: 1080,
		});
		expect(at25.u_intensity).toBe(0.25);
		expect(at75.u_intensity).toBe(0.75);
	});
});
