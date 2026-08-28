import type {
	AnimationInterpolation,
	AnimationPath,
	AnimationValue,
	AnimationValueKind,
} from "@/lib/animation/types";
import {
	parseEffectParamPath,
	isEffectParamPath,
} from "@/lib/animation/effect-param-channel";
import {
	isGraphicParamPath,
	parseGraphicParamPath,
} from "@/lib/animation/graphic-param-channel";
import {
	isTransformParamPath,
	parseTransformParamPath,
} from "@/lib/animation/transform-param-channel";
import type { ParamDefinition } from "@/lib/params";
import { effectsRegistry, registerDefaultEffects } from "@/lib/effects";
import { getGraphicDefinition } from "@/lib/graphics";
import { transformsRegistry } from "@/lib/transforms/registry";
import type { TimelineElement } from "@/lib/timeline";
import {
	isTransformableElement,
	isVisualElement,
} from "@/lib/timeline/element-utils";
import { snapToStep } from "@/utils/math";
import {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
	getElementBaseValueForProperty,
	isAnimationPropertyPath,
	type NumericSpec,
	withElementBaseValueForProperty,
} from "./property-registry";

export interface AnimationPathDescriptor {
	valueKind: AnimationValueKind;
	defaultInterpolation: AnimationInterpolation;
	numericRange?: NumericSpec;
	getBaseValue(): AnimationValue | null;
	setBaseValue(value: AnimationValue): TimelineElement;
}

export function getParamValueKind({
	param,
}: {
	param: ParamDefinition;
}): AnimationValueKind {
	if (param.type === "number") {
		return "number";
	}

	if (param.type === "color") {
		return "color";
	}

	return "discrete";
}

export function getParamDefaultInterpolation({
	param,
}: {
	param: ParamDefinition;
}): AnimationInterpolation {
	return param.type === "number" || param.type === "color" ? "linear" : "hold";
}

function getParamNumericRange({
	param,
}: {
	param: ParamDefinition;
}): NumericSpec | undefined {
	if (param.type !== "number") {
		return undefined;
	}

	return {
		min: param.min,
		max: param.max,
		step: param.step,
	};
}

function coerceParamValue({
	param,
	value,
}: {
	param: ParamDefinition;
	value: AnimationValue;
}): number | string | boolean | null {
	if (param.type === "number") {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return null;
		}

		const steppedValue = snapToStep({ value, step: param.step });
		const minValue = param.min;
		const maxValue = param.max ?? Number.POSITIVE_INFINITY;
		return Math.min(maxValue, Math.max(minValue, steppedValue));
	}

	if (param.type === "color") {
		return typeof value === "string" ? value : null;
	}

	if (param.type === "boolean") {
		return typeof value === "boolean" ? value : null;
	}

	if (typeof value !== "string") {
		return null;
	}

	return param.options.some((option) => option.value === value) ? value : null;
}

function buildGraphicParamDescriptor({
	element,
	paramKey,
}: {
	element: TimelineElement;
	paramKey: string;
}): AnimationPathDescriptor | null {
	if (element.type !== "graphic") {
		return null;
	}

	const definition = getGraphicDefinition({
		definitionId: element.definitionId,
	});
	const param = definition.params.find(
		(candidate) => candidate.key === paramKey,
	);
	if (!param) {
		return null;
	}

	return {
		valueKind: getParamValueKind({ param }),
		defaultInterpolation: getParamDefaultInterpolation({ param }),
		numericRange: getParamNumericRange({ param }),
		getBaseValue: () => element.params[param.key] ?? param.default,
		setBaseValue: (value) => {
			const coercedValue = coerceParamValue({ param, value });
			if (coercedValue === null) {
				return element;
			}

			return {
				...element,
				params: {
					...element.params,
					[param.key]: coercedValue,
				},
			};
		},
	};
}

function buildEffectParamDescriptor({
	element,
	effectId,
	paramKey,
}: {
	element: TimelineElement;
	effectId: string;
	paramKey: string;
}): AnimationPathDescriptor | null {
	if (!isVisualElement(element)) {
		return null;
	}

	const effect = element.effects?.find(
		(candidate) => candidate.id === effectId,
	);
	if (!effect) {
		return null;
	}

	registerDefaultEffects();
	const definition = effectsRegistry.get(effect.type);
	const param = definition.params.find(
		(candidate) => candidate.key === paramKey,
	);
	if (!param) {
		return null;
	}

	return {
		valueKind: getParamValueKind({ param }),
		defaultInterpolation: getParamDefaultInterpolation({ param }),
		numericRange: getParamNumericRange({ param }),
		getBaseValue: () => effect.params[param.key] ?? param.default,
		setBaseValue: (value) => {
			const coercedValue = coerceParamValue({ param, value });
			if (coercedValue === null) {
				return element;
			}

			return {
				...element,
				effects:
					element.effects?.map((candidate) =>
						candidate.id !== effectId
							? candidate
							: {
									...candidate,
									params: {
										...candidate.params,
										[param.key]: coercedValue,
									},
								},
					) ?? element.effects,
			};
		},
	};
}

function buildTransformParamDescriptor({
	element,
	transformId,
	paramKey,
}: {
	element: TimelineElement;
	transformId: string;
	paramKey: string;
}): AnimationPathDescriptor | null {
	if (!isTransformableElement(element)) {
		return null;
	}

	const transform = element.clipTransforms?.find(
		(candidate) => candidate.id === transformId,
	);
	if (!transform) {
		return null;
	}

	const definition = transformsRegistry.get(transform.type);
	const param = definition.params.find(
		(candidate) => candidate.key === paramKey,
	);
	if (!param) {
		return null;
	}

	return {
		valueKind: getParamValueKind({ param }),
		defaultInterpolation: getParamDefaultInterpolation({ param }),
		numericRange: getParamNumericRange({ param }),
		getBaseValue: () => transform.params[param.key] ?? param.default,
		setBaseValue: (value) => {
			const coercedValue = coerceParamValue({ param, value });
			if (coercedValue === null) {
				return element;
			}

			return {
				...element,
				clipTransforms:
					element.clipTransforms?.map((candidate) =>
						candidate.id !== transformId
							? candidate
							: {
									...candidate,
									params: {
										...candidate.params,
										[param.key]: coercedValue,
									},
								},
					) ?? element.clipTransforms,
			};
		},
	};
}

export function isAnimationPath(
	propertyPath: string,
): propertyPath is AnimationPath {
	return (
		isAnimationPropertyPath(propertyPath) ||
		isGraphicParamPath(propertyPath) ||
		isEffectParamPath(propertyPath) ||
		isTransformParamPath(propertyPath)
	);
}

export function resolveAnimationTarget({
	element,
	path,
}: {
	element: TimelineElement;
	path: AnimationPath;
}): AnimationPathDescriptor | null {
	if (isAnimationPropertyPath(path)) {
		const propertyDefinition = getAnimationPropertyDefinition({
			propertyPath: path,
		});
		if (!propertyDefinition.supportsElement({ element })) {
			return null;
		}

		return {
			valueKind: propertyDefinition.valueKind,
			defaultInterpolation: propertyDefinition.defaultInterpolation,
			numericRange: propertyDefinition.numericRange,
			getBaseValue: () =>
				getElementBaseValueForProperty({
					element,
					propertyPath: path,
				}),
			setBaseValue: (value) => {
				const coercedValue = coerceAnimationValueForProperty({
					propertyPath: path,
					value,
				});
				if (coercedValue === null) {
					return element;
				}

				return withElementBaseValueForProperty({
					element,
					propertyPath: path,
					value: coercedValue,
				});
			},
		};
	}

	const graphicParamTarget = parseGraphicParamPath({ propertyPath: path });
	if (graphicParamTarget) {
		return buildGraphicParamDescriptor({
			element,
			paramKey: graphicParamTarget.paramKey,
		});
	}

	const effectParamTarget = parseEffectParamPath({ propertyPath: path });
	if (effectParamTarget) {
		return buildEffectParamDescriptor({
			element,
			effectId: effectParamTarget.effectId,
			paramKey: effectParamTarget.paramKey,
		});
	}

	const transformParamTarget = parseTransformParamPath({ propertyPath: path });
	if (transformParamTarget) {
		return buildTransformParamDescriptor({
			element,
			transformId: transformParamTarget.transformId,
			paramKey: transformParamTarget.paramKey,
		});
	}

	return null;
}
