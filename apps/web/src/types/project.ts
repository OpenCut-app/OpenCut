import { CanvasSize } from "./editor";

export type BlurIntensity = 4 | 8 | 18;

export interface Scene {
  id: string;
  name: string;
  isMain: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TProject {
  id: string;
  name: string;
  thumbnail: string;
  createdAt: Date;
  updatedAt: Date;
  scenes: Scene[];
  currentSceneId: string;
  mediaItems?: string[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: BlurIntensity;
  fps?: number;
  bookmarks?: number[];
  canvasSize: CanvasSize;
  /**
   * Tracks how the canvas size was set:
   * - "preset": User selected a standard preset (e.g. 16:9, 9:16)
   * - "original": Using the first media item's dimensions
   * - "custom": User set a custom aspect ratio or dimensions
   */
  canvasMode: "preset" | "original" | "custom";
}
