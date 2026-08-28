export const ANIMATION_PROPERTY_PATHS = [
	"transform.position",
	"transform.scaleX",
	"transform.scaleY",
	"transform.rotate",
	"opacity",
	"volume",
	"color",
	"background.color",
	"background.paddingX",
	"background.paddingY",
	"background.offsetX",
	"background.offsetY",
	"background.cornerRadius",
] as const;

export type AnimationPropertyPath = (typeof ANIMATION_PROPERTY_PATHS)[number];
export type GraphicParamPath = `params.${string}`;
export type EffectParamPath = `effects.${string}.params.${string}`;
export type TransformParamPath = `clipTransforms.${string}.params.${string}`;
export type AnimationPath =
	| AnimationPropertyPath
	| GraphicParamPath
	| EffectParamPath
	| TransformParamPath;

export const ANIMATION_PROPERTY_GROUPS = {
	"transform.scale": ["transform.scaleX", "transform.scaleY"],
} as const satisfies Record<string, ReadonlyArray<AnimationPropertyPath>>;

export type AnimationPropertyGroup = keyof typeof ANIMATION_PROPERTY_GROUPS;

export type VectorValue = { x: number; y: number };

export type AnimationValueKind = "number" | "color" | "discrete" | "vector";
export type DiscreteValue = boolean | string;
export type AnimationValue = number | string | boolean | VectorValue;

export type ContinuousKeyframeInterpolation = "linear" | "hold";
export type DiscreteKeyframeInterpolation = "hold";
export type AnimationInterpolation =
	| ContinuousKeyframeInterpolation
	| DiscreteKeyframeInterpolation;

interface BaseAnimationKeyframe<
	TValue extends AnimationValue,
	TInterpolation extends AnimationInterpolation,
> {
	id: string;
	time: number; // relative to element start time
	value: TValue;
	interpolation: TInterpolation;
}

export interface NumberKeyframe
	extends BaseAnimationKeyframe<number, ContinuousKeyframeInterpolation> {}

export interface ColorKeyframe
	extends BaseAnimationKeyframe<string, ContinuousKeyframeInterpolation> {}

export interface DiscreteKeyframe
	extends BaseAnimationKeyframe<DiscreteValue, DiscreteKeyframeInterpolation> {}

export interface VectorKeyframe
	extends BaseAnimationKeyframe<VectorValue, ContinuousKeyframeInterpolation> {}

export type AnimationKeyframe =
	| NumberKeyframe
	| ColorKeyframe
	| DiscreteKeyframe
	| VectorKeyframe;

interface BaseAnimationChannel<
	TValueKind extends AnimationValueKind,
	TKeyframe extends AnimationKeyframe,
> {
	valueKind: TValueKind;
	keyframes: TKeyframe[];
}

export interface NumberAnimationChannel
	extends BaseAnimationChannel<"number", NumberKeyframe> {}

export interface ColorAnimationChannel
	extends BaseAnimationChannel<"color", ColorKeyframe> {}

export interface DiscreteAnimationChannel
	extends BaseAnimationChannel<"discrete", DiscreteKeyframe> {}

export interface VectorAnimationChannel
	extends BaseAnimationChannel<"vector", VectorKeyframe> {}

export type AnimationChannel =
	| NumberAnimationChannel
	| ColorAnimationChannel
	| DiscreteAnimationChannel
	| VectorAnimationChannel;

export type ElementAnimationChannelMap = Record<
	string,
	AnimationChannel | undefined
>;

export interface ElementAnimations {
	channels: ElementAnimationChannelMap;
}

export interface ElementKeyframe {
	propertyPath: AnimationPath;
	id: string;
	time: number;
	value: AnimationValue;
	interpolation: AnimationInterpolation;
}

export interface SelectedKeyframeRef {
	trackId: string;
	elementId: string;
	propertyPath: AnimationPath;
	keyframeId: string;
}
