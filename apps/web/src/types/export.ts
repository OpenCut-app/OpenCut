export type ExportFormat = "mp4" | "webm";
export type ExportQuality = "low" | "medium" | "high" | "very_high";

export interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  fps?: number;
  includeAudio?: boolean;
  onProgress?: (progress: number) => void;
  onCancel?: () => boolean;
}

export interface ExportResult {
  success: boolean;
  buffer?: ArrayBuffer;
  error?: string;
  cancelled?: boolean;
}
