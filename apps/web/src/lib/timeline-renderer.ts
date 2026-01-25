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

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const clampedRadius = Math.max(
    0,
    Math.min(radius, safeWidth / 2, safeHeight / 2)
  );

  if (clampedRadius === 0) {
    ctx.fillRect(x, y, safeWidth, safeHeight);
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x + clampedRadius, y);
  ctx.arcTo(x + safeWidth, y, x + safeWidth, y + safeHeight, clampedRadius);
  ctx.arcTo(x + safeWidth, y + safeHeight, x, y + safeHeight, clampedRadius);
  ctx.arcTo(x, y + safeHeight, x, y, clampedRadius);
  ctx.arcTo(x, y, x + safeWidth, y, clampedRadius);
  ctx.closePath();
  ctx.fill();
}

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
        const img = await getImageElement(mediaItem);
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
      const padX = Math.max(0, text.backgroundPaddingX ?? 8) * scaleX;
      const padY = Math.max(0, text.backgroundPaddingY ?? 4) * scaleX;
      const radius = Math.max(0, text.backgroundRadius ?? 0) * scaleX;
      const shadowOffsetX = (text.boxShadowOffsetX ?? 0) * scaleX;
      const shadowOffsetY = (text.boxShadowOffsetY ?? 0) * scaleX;
      const hasBoxShadow =
        (shadowOffsetX !== 0 || shadowOffsetY !== 0) &&
        !!text.boxShadowColor &&
        text.boxShadowColor !== "transparent";

      let bgLeft = -textW / 2;
      if (ctx.textAlign === "left") bgLeft = 0;
      if (ctx.textAlign === "right") bgLeft = -textW;

      const backgroundX = bgLeft - padX;
      const backgroundY = -textH / 2 - padY;
      const backgroundW = textW + padX * 2;
      const backgroundH = textH + padY * 2;
      const shouldDrawBackground =
        !!text.backgroundColor && text.backgroundColor !== "transparent";

      if (shouldDrawBackground) {
        ctx.save();
        ctx.fillStyle = text.backgroundColor;
        fillRoundedRect(
          ctx,
          backgroundX,
          backgroundY,
          backgroundW,
          backgroundH,
          radius
        );
        ctx.restore();
      }

      if (hasBoxShadow) {
        ctx.save();
        const clampedShadowOpacity = Math.max(
          0,
          Math.min(1, text.boxShadowOpacity ?? 0.6)
        );
        ctx.globalAlpha = ctx.globalAlpha * clampedShadowOpacity;
        ctx.fillStyle = text.boxShadowColor ?? "#000000";
        ctx.fillText(text.content, shadowOffsetX, shadowOffsetY);
        ctx.restore();
      }

      const outlineWidth = Math.max(0, text.outlineWidth ?? 0) * scaleX;
      if (outlineWidth > 0) {
        ctx.save();
        ctx.lineWidth = outlineWidth;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeStyle = text.outlineColor ?? "#000000";
        ctx.strokeText(text.content, 0, 0);
        ctx.restore();
      }
      ctx.fillText(text.content, 0, 0);
      ctx.restore();
    }
  }
}
