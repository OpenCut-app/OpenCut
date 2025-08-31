import { Input, ALL_FORMATS, BlobSource, VideoSampleSink } from "mediabunny";
import type { TimelineTrack } from "@/types/timeline";
import type { MediaFile } from "@/types/media";
import { parametersToCSSFilters } from "./effects-utils";
import type { EffectParameters } from "@/types/effects";

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  time: number;
  canvasWidth: number;
  canvasHeight: number;
  tracks: TimelineTrack[];
  mediaFiles: MediaFile[];
  backgroundColor?: string;
  projectCanvasSize?: { width: number; height: number };
  getEffectsForElement?: (elementId: string) => Array<{
    enabled: boolean;
    parameters: EffectParameters;
  }>;
}

export async function renderTimelineFrame({
  ctx,
  time,
  canvasWidth,
  canvasHeight,
  tracks,
  mediaFiles,
  backgroundColor,
  projectCanvasSize,
  getEffectsForElement,
}: RenderContext): Promise<void> {
  // Background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (backgroundColor && backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
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
      if ((element as any).hidden) continue;
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

  for (const { element, mediaItem } of active) {
    if (element.type === "media" && mediaItem) {
      if (mediaItem.type === "video") {
        const input = new Input({
          source: new BlobSource(mediaItem.file),
          formats: ALL_FORMATS,
        });
        const track = await input.getPrimaryVideoTrack();
        if (!track) continue;
        const decodable = await track.canDecode();
        if (!decodable) continue;
        const sink = new VideoSampleSink(track);

        const localTime = time - element.startTime + element.trimStart;
        const sample = await sink.getSample(localTime);
        if (!sample) continue;

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
        
        // Apply effects if available
        try {
          if (getEffectsForElement) {
            const effects = getEffectsForElement(element.id);
            const activeEffects = effects.filter(effect => effect.enabled);
            
            if (activeEffects.length > 0) {
              // Combine all active effects
              const combinedParameters = activeEffects.reduce((acc, effect) => {
                Object.assign(acc, effect.parameters);
                return acc;
              }, {} as EffectParameters);
              
              // Apply CSS filters to canvas context
              const filterString = parametersToCSSFilters(combinedParameters);
              ctx.filter = filterString;
            }
          }
        } catch (error) {
          console.error("Error applying effects:", error);
          // Continue without effects if there's an error
        }
        
        sample.draw(ctx, drawX, drawY, drawW, drawH);
        
        // Reset filter after drawing
        ctx.filter = "none";
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
      const posX = canvasWidth / 2 + (element as any).x * scaleX;
      const posY = canvasHeight / 2 + (element as any).y * scaleY;
      ctx.save();
      ctx.translate(posX, posY);
      ctx.rotate(((element as any).rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, Math.min(1, (element as any).opacity));
      const px = (element as any).fontSize * scaleX;
      const weight = (element as any).fontWeight === "bold" ? "bold " : "";
      const style = (element as any).fontStyle === "italic" ? "italic " : "";
      ctx.font = `${style}${weight}${px}px ${(element as any).fontFamily}`;
      ctx.fillStyle = (element as any).color;
      ctx.textAlign = (element as any).textAlign;
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText((element as any).content);
      const ascent =
        (metrics as unknown as { actualBoundingBoxAscent?: number })
          .actualBoundingBoxAscent ?? px * 0.8;
      const descent =
        (metrics as unknown as { actualBoundingBoxDescent?: number })
          .actualBoundingBoxDescent ?? px * 0.2;
      const textW = metrics.width;
      const textH = ascent + descent;
      const padX = 8 * scaleX;
      const padY = 4 * scaleX;
      if ((element as any).backgroundColor) {
        ctx.save();
        ctx.fillStyle = (element as any).backgroundColor;
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
      ctx.fillText((element as any).content, 0, 0);
      ctx.restore();
    }
  }
}
