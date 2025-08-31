import type { EffectParameters } from "@/types/effects";

/**
 * Converts effect parameters to CSS filter string
 * This is used for real-time preview of effects in the video editor
 */
export function parametersToCSSFilters(parameters: EffectParameters): string {
  const filters: string[] = [];

  // Brightness
  if (parameters.brightness !== undefined) {
    const brightness = 1 + parameters.brightness / 100;
    filters.push(`brightness(${brightness})`);
  }

  // Contrast
  if (parameters.contrast !== undefined) {
    const contrast = 1 + parameters.contrast / 100;
    filters.push(`contrast(${contrast})`);
  }

  // Saturation
  if (parameters.saturation !== undefined) {
    const saturation = 1 + parameters.saturation / 100;
    filters.push(`saturate(${saturation})`);
  }

  // Hue rotation
  if (parameters.hue !== undefined) {
    filters.push(`hue-rotate(${parameters.hue}deg)`);
  }

  // Blur
  if (parameters.blur !== undefined) {
    filters.push(`blur(${parameters.blur}px)`);
  }

  // Sepia
  if (parameters.sepia !== undefined) {
    const sepia = parameters.sepia / 100;
    filters.push(`sepia(${sepia})`);
  }

  // Grayscale
  if (parameters.grayscale !== undefined) {
    const grayscale = parameters.grayscale / 100;
    filters.push(`grayscale(${grayscale})`);
  }

  // Invert
  if (parameters.invert !== undefined) {
    const invert = parameters.invert / 100;
    filters.push(`invert(${invert})`);
  }

  // Combined effects that need custom implementation
  if (parameters.vintage !== undefined) {
    // Vintage effect combines multiple filters
    const vintage = parameters.vintage / 100;
    filters.push(`sepia(${vintage * 0.8})`);
    filters.push(`contrast(${1 + vintage * 0.2})`);
    filters.push(`brightness(${1 - vintage * 0.1})`);
  }

  if (parameters.dramatic !== undefined) {
    // Dramatic effect
    const dramatic = parameters.dramatic / 100;
    filters.push(`contrast(${1 + dramatic * 0.4})`);
    filters.push(`brightness(${1 - dramatic * 0.1})`);
    filters.push(`saturate(${1 - dramatic * 0.2})`);
  }

  if (parameters.warm !== undefined) {
    // Warm effect
    const warm = parameters.warm / 100;
    filters.push(`sepia(${warm * 0.3})`);
    filters.push(`hue-rotate(${warm * 15}deg)`);
    filters.push(`brightness(${1 + warm * 0.05})`);
  }

  if (parameters.cool !== undefined) {
    // Cool effect
    const cool = parameters.cool / 100;
    filters.push(`hue-rotate(${-cool * 15}deg)`);
    filters.push(`saturate(${1 + cool * 0.1})`);
    filters.push(`brightness(${1 - cool * 0.05})`);
  }

  if (parameters.cinematic !== undefined) {
    // Cinematic effect
    const cinematic = parameters.cinematic / 100;
    filters.push(`contrast(${1 + cinematic * 0.25})`);
    filters.push(`brightness(${1 - cinematic * 0.05})`);
    filters.push(`saturate(${1 + cinematic * 0.1})`);
  }

  // Note: Some effects like vignette, grain, sharpen, emboss, edge detection, and pixelate
  // require more complex implementations using canvas or WebGL
  // For now, we'll focus on the basic CSS filter effects

  return filters.join(" ");
}

/**
 * Applies effects to a video element using CSS filters
 */
export function applyEffectsToVideo(
  videoElement: HTMLVideoElement,
  parameters: EffectParameters
): void {
  const filterString = parametersToCSSFilters(parameters);
  videoElement.style.filter = filterString;
}

/**
 * Removes all effects from a video element
 */
export function removeEffectsFromVideo(videoElement: HTMLVideoElement): void {
  videoElement.style.filter = "";
}

/**
 * Creates a preview canvas with effects applied
 * This is used for generating thumbnails with effects
 */
export function createEffectPreview(
  sourceElement: HTMLVideoElement | HTMLImageElement,
  parameters: EffectParameters,
  width: number = 200,
  height: number = 200
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  canvas.width = width;
  canvas.height = height;

  // Apply CSS filters to the canvas context
  const filterString = parametersToCSSFilters(parameters);

  // For canvas, we need to apply filters differently
  // This is a simplified version - in a real implementation,
  // you'd want to use more sophisticated image processing

  ctx.filter = filterString;
  ctx.drawImage(sourceElement, 0, 0, width, height);

  return canvas;
}

/**
 * Gets the intensity of an effect for UI display
 */
export function getEffectIntensity(parameters: EffectParameters): number {
  const values = Object.values(parameters).filter(
    (value) => typeof value === "number"
  );

  if (values.length === 0) return 0;

  // Calculate average intensity
  const sum = values.reduce((acc, val) => acc + Math.abs(val), 0);
  return sum / values.length;
}

/**
 * Validates effect parameters
 */
export function validateEffectParameters(parameters: EffectParameters): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check brightness range
  if (
    parameters.brightness !== undefined &&
    (parameters.brightness < -100 || parameters.brightness > 100)
  ) {
    errors.push("Brightness must be between -100 and 100");
  }

  // Check contrast range
  if (
    parameters.contrast !== undefined &&
    (parameters.contrast < -100 || parameters.contrast > 100)
  ) {
    errors.push("Contrast must be between -100 and 100");
  }

  // Check saturation range
  if (
    parameters.saturation !== undefined &&
    (parameters.saturation < -100 || parameters.saturation > 100)
  ) {
    errors.push("Saturation must be between -100 and 100");
  }

  // Check hue range
  if (
    parameters.hue !== undefined &&
    (parameters.hue < -180 || parameters.hue > 180)
  ) {
    errors.push("Hue must be between -180 and 180");
  }

  // Check blur range
  if (
    parameters.blur !== undefined &&
    (parameters.blur < 0 || parameters.blur > 50)
  ) {
    errors.push("Blur must be between 0 and 50");
  }

  // Check percentage-based parameters
  const percentageParams = [
    "sepia",
    "grayscale",
    "invert",
    "vintage",
    "dramatic",
    "warm",
    "cool",
    "cinematic",
    "vignette",
    "grain",
    "sharpen",
  ];

  percentageParams.forEach((param) => {
    const value = parameters[param as keyof EffectParameters];
    if (value !== undefined && (value < 0 || value > 100)) {
      errors.push(`${param} must be between 0 and 100`);
    }
  });

  // Check pixelate range
  if (
    parameters.pixelate !== undefined &&
    (parameters.pixelate < 1 || parameters.pixelate > 50)
  ) {
    errors.push("Pixelate must be between 1 and 50");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
