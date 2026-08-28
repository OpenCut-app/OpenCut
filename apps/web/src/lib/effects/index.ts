import { generateUUID } from "@/utils/id";
import { buildDefaultParamValues } from "@/lib/registry";
import { effectsRegistry } from "./registry";
import type { ParamValues } from "@/lib/params";
import type {
	Effect,
	EffectContext,
	EffectDefinition,
	ResolvedEffectPass,
} from "@/lib/effects/types";
import { VISUAL_ELEMENT_TYPES } from "@/lib/timeline";

export { effectsRegistry } from "./registry";
export { registerDefaultEffects } from "./definitions";
export { registerDefaultPresets } from "./presets";

export function resolveEffectPasses({
	definition,
	effectParams,
	width,
	height,
	time,
	context,
}: {
	definition: EffectDefinition;
	effectParams: ParamValues;
	width: number;
	height: number;
	time?: number;
	context?: EffectContext;
}): ResolvedEffectPass[] {
	if (definition.renderer.buildPasses) {
		return definition.renderer.buildPasses({ effectParams, width, height });
	}
	return definition.renderer.passes.map((pass) => ({
		fragmentShader: pass.fragmentShader,
		uniforms: pass.uniforms({ effectParams, width, height, time, context }),
	}));
}

export const EFFECT_TARGET_ELEMENT_TYPES = VISUAL_ELEMENT_TYPES;

export function buildDefaultEffectInstance({
	effectType,
}: {
	effectType: string;
}): Effect {
	const definition = effectsRegistry.get(effectType);
	const params: ParamValues = buildDefaultParamValues(definition.params);

	return {
		id: generateUUID(),
		type: effectType,
		params,
		enabled: true,
	};
}
