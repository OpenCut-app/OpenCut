import { CanvasSize } from "@/types/editor";

const DEFAULT_CANVAS_PRESETS = [
  { name: "16:9", width: 1920, height: 1080 },
  { name: "9:16", width: 1080, height: 1920 },
  { name: "1:1", width: 1080, height: 1080 },
  { name: "4:3", width: 1440, height: 1080 },
];

/**
 * Helper function to find the best matching canvas preset for an aspect ratio
 * @param aspectRatio The target aspect ratio to match
 * @returns The best matching canvas size
 */
export function findBestCanvasPreset(aspectRatio: number): CanvasSize {
  // Calculate aspect ratio for each preset and find the closest match
  let bestMatch = DEFAULT_CANVAS_PRESETS[0]; // Default to 16:9 HD
  let smallestDifference = Math.abs(
    aspectRatio - bestMatch.width / bestMatch.height
  );

  for (const preset of DEFAULT_CANVAS_PRESETS) {
    const presetAspectRatio = preset.width / preset.height;
    const difference = Math.abs(aspectRatio - presetAspectRatio);

    if (difference < smallestDifference) {
      smallestDifference = difference;
      bestMatch = preset;
    }
  }

  // If the difference is still significant (> 0.1), create a custom size
  // based on the media aspect ratio with a reasonable resolution
  const bestAspectRatio = bestMatch.width / bestMatch.height;
  if (Math.abs(aspectRatio - bestAspectRatio) > 0.1) {
    // Create custom dimensions based on the aspect ratio
    if (aspectRatio > 1) {
      // Landscape - use 1920 width
      return { width: 1920, height: Math.round(1920 / aspectRatio) };
    }
    // Portrait or square - use 1080 height
    return { width: Math.round(1080 * aspectRatio), height: 1080 };
  }

  return { width: bestMatch.width, height: bestMatch.height };
}
