export {
	getChannelValueAtTime,
	getNumberChannelValueAtTime,
	getVectorChannelValueAtTime,
	normalizeChannel,
} from "./interpolation";

export {
	clampAnimationsToDuration,
	cloneAnimations,
	getChannel,
	removeElementKeyframe,
	retimeElementKeyframe,
	setChannel,
	splitAnimationsAtTime,
	upsertElementKeyframe,
	upsertPathKeyframe,
} from "./keyframes";

export {
	getElementLocalTime,
	resolveColorAtTime,
	resolveNumberAtTime,
	resolveOpacityAtTime,
	resolveTransformAtTime,
} from "./resolve";

export {
	coerceAnimationValueForProperty,
	getAnimationPropertyDefinition,
	getDefaultInterpolationForProperty,
	getElementBaseValueForProperty,
	isAnimationPropertyPath,
	supportsAnimationProperty,
	type AnimationPropertyDefinition,
	type NumericSpec,
	type NumericRange,
	withElementBaseValueForProperty,
} from "./property-registry";

export {
	getElementKeyframes,
	getKeyframeAtTime,
	hasKeyframesForPath,
} from "./keyframe-query";

export {
	buildGraphicParamPath,
	isGraphicParamPath,
	parseGraphicParamPath,
	resolveGraphicParamsAtTime,
} from "./graphic-param-channel";

export {
	EFFECT_PARAM_PATH_PREFIX,
	EFFECT_PARAM_PATH_SUFFIX,
	buildEffectParamPath,
	isEffectParamPath,
	parseEffectParamPath,
	removeEffectParamKeyframe,
	resolveEffectParamsAtTime,
	upsertEffectParamKeyframe,
} from "./effect-param-channel";

export {
	TRANSFORM_PARAM_PATH_PREFIX,
	TRANSFORM_PARAM_PATH_SUFFIX,
	buildTransformParamPath,
	isTransformParamPath,
	parseTransformParamPath,
	removeTransformParamKeyframe,
	resolveTransformParamsAtTime,
	upsertTransformParamKeyframe,
} from "./transform-param-channel";

export {
	isAnimationPath,
	resolveAnimationTarget,
	getParamValueKind,
	getParamDefaultInterpolation,
	type AnimationPathDescriptor,
} from "./target-resolver";

export {
	getGroupKeyframesAtTime,
	hasGroupKeyframeAtTime,
	type GroupKeyframeRef,
} from "./property-groups";

export {
	getVectorChannelForPath,
	isVectorValue,
} from "./vector-channel";
