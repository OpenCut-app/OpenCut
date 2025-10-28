import type { TimelineTrack } from "@/types/timeline";
import type { MediaFile } from "@/types/media";
import type { BlurIntensity } from "@/types/project";
import { videoCache } from "./video-cache";
import { drawCssBackground } from "./canvas-gradients";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  tracks: TimelineTrack[];
  mediaFiles: MediaFile[];
  backgroundColor?: string;
  backgroundType?: "color" | "blur";
  blurIntensity?: BlurIntensity;
  projectCanvasSize?: { width: number; height: number };
}

const imageElementCache = new Map<string, HTMLImageElement>();

async function getImageElement(
  mediaItem: MediaFile
): Promise<HTMLImageElement> {
  const cacheKey = mediaItem.id;
  const cached = imageElementCache.get(cacheKey);
  if (cached) return cached;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = mediaItem.url || URL.createObjectURL(mediaItem.file);
  });
  imageElementCache.set(cacheKey, img);
  return img;
}

export async function renderTimelineFrame({
  ctx,
  time,
  canvasWidth,
  canvasHeight,
  tracks,
  mediaFiles,
  backgroundColor,
  backgroundType,
  blurIntensity,
  projectCanvasSize,
}: RenderContext): Promise<void> {
  // Background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (
    backgroundColor &&
    backgroundColor !== "transparent" &&
    !backgroundColor.includes("gradient")
  ) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // If backgroundColor is a CSS gradient string, draw it
  if (backgroundColor && backgroundColor.includes("gradient")) {
    drawCssBackground(ctx, canvasWidth, canvasHeight, backgroundColor);
  }

  const scaleX = projectCanvasSize ? canvasWidth / projectCanvasSize.width : 1;
  const scaleY = projectCanvasSize
    ? canvasHeight / projectCanvasSize.height
    : 1;
  const idToMedia = new Map(mediaFiles.map((m) => [m.id, m] as const));
  const active: Array<{
    track: TimelineTrack;
    element: TimelineTrack["elements"][number];
    mediaItem: MediaFile | null;
  }> = [];

  for (let t = tracks.length - 1; t >= 0; t -= 1) {
    const track = tracks[t];
    for (const element of track.elements) {
      if (element.hidden) continue;
      const elementStart = element.startTime;
      const elementEnd =
        element.startTime +
        (element.duration - element.trimStart - element.trimEnd);
      if (time >= elementStart && time < elementEnd) {
        let mediaItem: MediaFile | null = null;
        if (element.type === "media") {
          mediaItem =
            element.mediaId === "test"
              ? null
              : idToMedia.get(element.mediaId) || null;
        }
        active.push({ track, element, mediaItem });
      }
    }
  }

  // If background is set to blur, draw the active media as a blurred cover layer first
  if (backgroundType === "blur") {
    const blurPx = Math.max(0, blurIntensity ?? 8);
    // Find a suitable media element (video/image) among active elements
    const bgCandidate = active.find(({ element, mediaItem }) => {
      return (
        element.type === "media" &&
        mediaItem !== null &&
        (mediaItem.type === "video" || mediaItem.type === "image")
      );
    });
    if (bgCandidate && bgCandidate.mediaItem) {
      const { element, mediaItem } = bgCandidate;
      try {
        if (mediaItem.type === "video") {
          const localTime = time - element.startTime + element.trimStart;
          const frame = await videoCache.getFrameAt(
            mediaItem.id,
            mediaItem.file,
            Math.max(0, localTime)
          );
          if (frame) {
            const mediaW = Math.max(1, mediaItem.width || canvasWidth);
            const mediaH = Math.max(1, mediaItem.height || canvasHeight);
            const coverScale = Math.max(
              canvasWidth / mediaW,
              canvasHeight / mediaH
            );
            const drawW = mediaW * coverScale;
            const drawH = mediaH * coverScale;
            const drawX = (canvasWidth - drawW) / 2;
            const drawY = (canvasHeight - drawH) / 2;
            ctx.save();
            ctx.filter = `blur(${blurPx}px)`;
            ctx.drawImage(frame.canvas, drawX, drawY, drawW, drawH);
            ctx.restore();
          }
        } else if (mediaItem.type === "image") {
          const img = await getImageElement(mediaItem);
          const mediaW = Math.max(
            1,
            mediaItem.width || img.naturalWidth || canvasWidth
          );
          const mediaH = Math.max(
            1,
            mediaItem.height || img.naturalHeight || canvasHeight
          );
          const coverScale = Math.max(
            canvasWidth / mediaW,
            canvasHeight / mediaH
          );
          const drawW = mediaW * coverScale;
          const drawH = mediaH * coverScale;
          const drawX = (canvasWidth - drawW) / 2;
          const drawY = (canvasHeight - drawH) / 2;
          ctx.save();
          ctx.filter = `blur(${blurPx}px)`;
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
        }
      } catch {
        // Ignore background blur failures; foreground will still render
      }
    }
  }

  for (const { element, mediaItem } of active) {
    if (element.type === "media" && mediaItem) {
      if (mediaItem.type === "video") {
        try {
          const localTime = time - element.startTime + element.trimStart;

          const frame = await videoCache.getFrameAt(
            mediaItem.id,
            mediaItem.file,
            localTime
          );
          if (!frame) continue;

          const mediaW = Math.max(1, mediaItem.width || canvasWidth);
          const mediaH = Math.max(1, mediaItem.height || canvasHeight);
          const containScale = Math.min(
            canvasWidth / mediaW,
            canvasHeight / mediaH
          );
          const drawW = mediaW * containScale;
          const drawH = mediaH * containScale;
          const drawX = (canvasWidth - drawW) / 2;
          const drawY = (canvasHeight - drawH) / 2;

          ctx.drawImage(frame.canvas, drawX, drawY, drawW, drawH);
        } catch (error) {
          console.warn(
            `Failed to render video frame for ${mediaItem.name}:`,
            error
          );
        }
      }
      if (mediaItem.type === "image") {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = mediaItem.url || URL.createObjectURL(mediaItem.file);
        });
        const mediaW = Math.max(
          1,
          mediaItem.width || img.naturalWidth || canvasWidth
        );
        const mediaH = Math.max(
          1,
          mediaItem.height || img.naturalHeight || canvasHeight
        );
        const containScale = Math.min(
          canvasWidth / mediaW,
          canvasHeight / mediaH
        );
        const drawW = mediaW * containScale;
        const drawH = mediaH * containScale;
        const drawX = (canvasWidth - drawW) / 2;
        const drawY = (canvasHeight - drawH) / 2;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
      }
    }
    if (element.type === "text") {
      const text = element;
      const posX = canvasWidth / 2 + text.x * scaleX;
      const posY = canvasHeight / 2 + text.y * scaleY;
      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate((text.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, Math.min(1, text.opacity));
      const px = text.fontSize * scaleX;
      const weight = text.fontWeight === "bold" ? "bold " : "";
      const style = text.fontStyle === "italic" ? "italic " : "";
      ctx.font = `${style}${weight}${px}px ${text.fontFamily}`;
      ctx.fillStyle = text.color;
      ctx.textAlign = text.textAlign as CanvasTextAlign;
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(text.content);
      const hasBoxMetrics =
        "actualBoundingBoxAscent" in metrics &&
        "actualBoundingBoxDescent" in metrics;
      const ascent = hasBoxMetrics
        ? (
            metrics as TextMetrics & {
              actualBoundingBoxAscent: number;
              actualBoundingBoxDescent: number;
            }
          ).actualBoundingBoxAscent
        : px * 0.8;
      const descent = hasBoxMetrics
        ? (
            metrics as TextMetrics & {
              actualBoundingBoxAscent: number;
              actualBoundingBoxDescent: number;
            }
          ).actualBoundingBoxDescent
        : px * 0.2;
      const textW = metrics.width;
      const textH = ascent + descent;
      const padX = 8 * scaleX;
      const padY = 4 * scaleX;
      if (text.backgroundColor) {
        ctx.save();
        ctx.fillStyle = text.backgroundColor;
        let bgLeft = -textW / 2;
        if (ctx.textAlign === "left") bgLeft = 0;
        if (ctx.textAlign === "right") bgLeft = -textW;
        ctx.fillRect(
          bgLeft - padX,
          -textH / 2 - padY,
          textW + padX * 2,
          textH + padY * 2
        );
        ctx.restore();
      }
      ctx.fillText(text.content, 0, 0);
      ctx.restore();
    }
  }
}
