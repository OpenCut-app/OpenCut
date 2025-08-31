export type EffectType =
  | "blur"
  | "brightness"
  | "contrast"
  | "saturation"
  | "hue"
  | "gamma"
  | "sepia"
  | "grayscale"
  | "invert"
  | "vintage"
  | "dramatic"
  | "warm"
  | "cool"
  | "cinematic"
  | "vignette"
  | "grain"
  | "sharpen"
  | "emboss"
  | "edge"
  | "pixelate";

export interface EffectPreset {
  id: string;
  name: string;
  description: string;
  category: EffectCategory;
  icon: string;
  parameters: EffectParameters;
  preview?: string;
}

export type EffectCategory =
  | "basic"
  | "color"
  | "artistic"
  | "vintage"
  | "cinematic"
  | "distortion";

export interface EffectParameters {
  // Basic adjustments
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  hue?: number; // -180 to 180
  gamma?: number; // 0.1 to 3.0

  // Blur effects
  blur?: number; // 0 to 50
  blurType?: "gaussian" | "box" | "motion";

  // Color effects
  sepia?: number; // 0 to 100
  grayscale?: number; // 0 to 100
  invert?: number; // 0 to 100

  // Artistic effects
  vintage?: number; // 0 to 100
  dramatic?: number; // 0 to 100
  warm?: number; // 0 to 100
  cool?: number; // 0 to 100
  cinematic?: number; // 0 to 100

  // Distortion effects
  vignette?: number; // 0 to 100
  grain?: number; // 0 to 100
  sharpen?: number; // 0 to 100
  emboss?: number; // 0 to 100
  edge?: number; // 0 to 100
  pixelate?: number; // 1 to 50
}

export interface TimelineEffect {
  id: string;
  elementId: string;
  trackId: string;
  effectType: EffectType;
  parameters: EffectParameters;
  startTime: number;
  endTime: number;
  enabled: boolean;
}

export interface EffectInstance {
  id: string;
  name: string;
  effectType: EffectType;
  parameters: EffectParameters;
  elementId: string;
  trackId: string;
  startTime: number;
  endTime: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
