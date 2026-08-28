import type { ParamValues } from "@/lib/params";

/**
 * Single keyframe within a preset param animation. `normalizedTime` is
 * 0..1 relative to the clip/element duration (ported from the source
 * package's `Keyframe.time`, renamed here to avoid confusion with the
 * absolute-seconds `time` used by dev's `@/lib/animation` channels).
 * `easing` is carried through from the source data for documentation
 * purposes only — dev's animation channels only support "linear" | "hold"
 * interpolation, so all preset keyframes are applied as "linear" when
 * converted to animation channels (see `apply-preset.ts`).
 */
export interface TransformPresetKeyframe {
	normalizedTime: number;
	value: number;
	easing?: string;
}

/**
 * A single transform entry within a preset. `params` holds the static
 * (non-animated) param values used to construct the `ClipTransform`
 * instance. `animatedParams` holds per-param keyframe arrays for params
 * that should animate over the clip duration — applying the preset
 * converts these into `@/lib/animation` channels at
 * `clipTransforms.<transformId>.params.<paramKey>`
 * (see `resolveTransformParamsAtTime` / `apply-preset.ts`).
 */
export interface TransformPresetEntry {
	/** Must match a registered transform type (e.g., "scale") */
	transformType: string;
	params: ParamValues;
	animatedParams?: Record<string, TransformPresetKeyframe[]>;
}

export type TransformPresetCategory = "motion" | "reveal" | "cinematic";

/** Curated combination of transforms with preset parameter values */
export interface TransformPreset {
	type: string;
	name: string;
	category: TransformPresetCategory;
	description: string;
	/**
	 * Duration hint in seconds (UI guidance only). Normalized keyframe
	 * times in `animatedParams` are mapped to absolute seconds using the
	 * TARGET clip's actual duration when the preset is applied, not this
	 * suggestion.
	 */
	suggestedDuration?: number;
	transforms: TransformPresetEntry[];
}
