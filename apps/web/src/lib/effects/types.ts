import type { ParamDefinition, ParamValues } from "@/lib/params";
import type { EffectCategory } from "@/lib/effects/categories";

export interface Effect {
	id: string;
	type: string;
	params: ParamValues;
	enabled: boolean;
}

export interface ResolvedEffectPass {
	fragmentShader: string;
	uniforms: Record<string, number | number[]>;
}

/**
 * Face landmark / mask data for face-aware beauty effects.
 * Populated by the renderer (via the face-mesh service) when a
 * beauty-category effect is active.
 */
export interface EffectContext {
	/** Face region mask as a flat array (0 = outside, 1 = face) */
	faceMask?: number[];
	/** Eye region mask */
	eyeMask?: number[];
	/** Mouth region mask */
	mouthMask?: number[];
	/** Left cheek center position [x, y] normalized 0..1 */
	cheekLeft?: number[];
	/** Right cheek center position [x, y] normalized 0..1 */
	cheekRight?: number[];
	/** Cheek radius normalized 0..1 */
	cheekRadius?: number;
	/** Jawline control points [x1,y1, x2,y2, ...] normalized 0..1 */
	jawPoints?: number[];
	/** Whether a face was detected in the current frame */
	faceDetected?: boolean;
}

export interface WebGLEffectPass {
	fragmentShader: string;
	uniforms(params: {
		effectParams: ParamValues;
		width: number;
		height: number;
		/** Current playback time in seconds — for animated effects (film grain, glitch) */
		time?: number;
		/** Face landmark data for beauty effects — populated by renderer */
		context?: EffectContext;
	}): Record<string, number | number[]>;
}

export interface WebGLEffectRenderer {
	type: "webgl";
	passes: WebGLEffectPass[];
	buildPasses?: (params: {
		effectParams: ParamValues;
		width: number;
		height: number;
	}) => ResolvedEffectPass[];
}

export type EffectRenderer = WebGLEffectRenderer;

export interface EffectDefinition {
	type: string;
	name: string;
	category?: EffectCategory;
	keywords: string[];
	params: ParamDefinition[];
	renderer: EffectRenderer;
}
