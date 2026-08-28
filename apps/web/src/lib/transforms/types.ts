import type { ParamDefinition, ParamValues } from "@/lib/params";
import type { TransformCategory } from "@/lib/transforms/categories";

/**
 * Transform instance attached to a timeline clip.
 * Mirrors `Effect` from `@/lib/effects/types` — reuses the shared
 * `@/lib/params` ParamValues shape instead of the standalone package's
 * custom keyframe/point param system, since dev's animation system
 * (`@/lib/animation`) already provides keyframing for any numeric param.
 */
export interface ClipTransform {
	id: string;
	type: string;
	params: ParamValues;
	enabled: boolean;
}

/** Spatial transform renderer — mutates a Canvas2D context (matrix ops). */
export interface SpatialTransformRenderer {
	type: "spatial";
	apply(params: {
		ctx: CanvasRenderingContext2D;
		transformParams: ParamValues;
		width: number;
		height: number;
	}): void;
}

/** Visual transform renderer — single-pass WebGL shader. */
export interface VisualTransformRenderer {
	type: "webgl";
	fragmentShader: string;
	uniforms(params: {
		transformParams: ParamValues;
		width: number;
		height: number;
		time?: number;
	}): Record<string, number | number[]>;
}

/**
 * Transition renderer — dual-source WebGL shader for clip-to-clip blends.
 * Registered for completeness (parity with source package) but NOT wired
 * into the per-clip render pipeline (`visual-node.ts`), which only
 * composites a single source per element. Clip-to-clip transition
 * compositing is a separate, larger scene-builder concern deferred to a
 * future phase.
 */
export interface TransitionRenderer {
	type: "transition";
	fragmentShader: string;
	uniforms(params: {
		progress: number;
		transformParams: ParamValues;
		width: number;
		height: number;
	}): Record<string, number | number[]>;
}

export type TransformRenderer =
	| SpatialTransformRenderer
	| VisualTransformRenderer
	| TransitionRenderer;

export interface TransformDefinition {
	type: string;
	name: string;
	category: TransformCategory;
	keywords: string[];
	params: ParamDefinition[];
	renderer: TransformRenderer;
}
