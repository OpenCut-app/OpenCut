"use client";

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useTimelineStore } from "@/stores/timeline-store";
import { useMediaStore } from "@/stores/media-store";
import { useEffectsStore } from "@/stores/effects-store";
import { ImageTimelineTreatment } from "@/components/ui/image-timeline-treatment";
import { useState } from "react";
import { SpeedControl } from "./speed-control";
import type { BackgroundType } from "@/types/editor";

export function PropertiesPanel() {
  const { tracks, selectedClips } = useTimelineStore();
  const { mediaItems } = useMediaStore();
  const { updateClipEffect, getClipEffects } = useEffectsStore();
  const [backgroundType, setBackgroundType] = useState<BackgroundType>("blur");
  const [backgroundColor, setBackgroundColor] = useState("#000000");

  // Get the first video clip for preview (simplified)
  const firstVideoClip = tracks
    .flatMap((track) => track.clips)
    .find((clip) => {
      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      return mediaItem?.type === "video";
    });

  const firstVideoItem = firstVideoClip
    ? mediaItems.find((item) => item.id === firstVideoClip.mediaId)
    : null;

  const firstImageClip = tracks
    .flatMap((track) => track.clips)
    .find((clip) => {
      const mediaItem = mediaItems.find((item) => item.id === clip.mediaId);
      return mediaItem?.type === "image";
    });

  const firstImageItem = firstImageClip
    ? mediaItems.find((item) => item.id === firstImageClip.mediaId)
    : null;

  // Get the currently selected clip for effects
  const selectedClip = selectedClips.length > 0 ? selectedClips[0] : null;
  const selectedTrack = selectedClip
    ? tracks.find((track) => track.id === selectedClip.trackId)
    : null;
  const selectedClipData = selectedClip && selectedTrack
    ? selectedTrack.clips.find((clip) => clip.id === selectedClip.clipId)
    : null;

  // Get current effects for selected clip
  const currentEffects = selectedClip
    ? getClipEffects(selectedClip.trackId, selectedClip.clipId)
    : { blur: 0, opacity: 100 };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-5">
        {/* Image Treatment - only show if an image is selected */}
        {firstImageItem && (
          <>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Image Treatment</h3>
              <div className="space-y-4">
                {/* Preview */}
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="w-full aspect-video max-w-48">
                    <ImageTimelineTreatment
                      src={firstImageItem.url}
                      alt={firstImageItem.name}
                      targetAspectRatio={16 / 9}
                      className="rounded-sm border"
                      backgroundType={backgroundType}
                      backgroundColor={backgroundColor}
                    />
                  </div>
                </div>

                {/* Background Type */}
                <div className="space-y-2">
                  <Label htmlFor="bg-type">Background Type</Label>
                  <Select
                    value={backgroundType}
                    onValueChange={(value: BackgroundType) =>
                      setBackgroundType(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select background type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blur">Blur</SelectItem>
                      <SelectItem value="mirror">Mirror</SelectItem>
                      <SelectItem value="color">Solid Color</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Background Color - only show for color type */}
                {backgroundType === "color" && (
                  <div className="space-y-2">
                    <Label htmlFor="bg-color">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="bg-color"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* Video Controls - only show if a video is selected */}
        {firstVideoItem && (
          <>
            <SpeedControl />
            <Separator />
          </>
        )}

        {/* Transform */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Transform</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="x">X Position</Label>
                <Input id="x" type="number" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="y">Y Position</Label>
                <Input id="y" type="number" defaultValue="0" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rotation">Rotation</Label>
              <Slider
                id="rotation"
                max={360}
                step={1}
                defaultValue={[0]}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Effects */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Effects</h3>
          {selectedClip ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="opacity">Opacity: {currentEffects.opacity}%</Label>
                <Slider
                  id="opacity"
                  max={100}
                  step={1}
                  value={[currentEffects.opacity]}
                  onValueChange={(value) => {
                    updateClipEffect(
                      selectedClip.trackId,
                      selectedClip.clipId,
                      "opacity",
                      value[0]
                    );
                  }}
                  className="mt-2"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="blur">Blur: {currentEffects.blur}px</Label>
                <Slider
                  id="blur"
                  max={20}
                  step={0.5}
                  value={[currentEffects.blur]}
                  onValueChange={(value) => {
                    updateClipEffect(
                      selectedClip.trackId,
                      selectedClip.clipId,
                      "blur",
                      value[0]
                    );
                  }}
                  className="mt-2"
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded">
              Select a clip to adjust effects
            </div>
          )}
        </div>

        <Separator />

        {/* Timing */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Timing</h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="duration">Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.1"
                defaultValue="5"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="delay">Delay (seconds)</Label>
              <Input
                id="delay"
                type="number"
                min="0"
                step="0.1"
                defaultValue="0"
              />
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
