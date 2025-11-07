import { useEffect, useCallback } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { toast } from "sonner";

export const usePlaybackControls = () => {
  const { isPlaying, currentTime, play, pause, seek } = usePlaybackStore();

  const {
    selectedElements,
    tracks,
    splitSelected,
    splitAndKeepLeft,
    splitAndKeepRight,
    separateAudio,
  } = useTimelineStore();

  const handleSplitSelectedElement = useCallback(() => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element to split");
      return;
    }

    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);

    if (!element) return;

    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }

    splitSelected(currentTime, trackId, elementId);
  }, [selectedElements, tracks, currentTime, splitSelected]);

  const handleSplitAndKeepLeftCallback = useCallback(() => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }

    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);

    if (!element) return;

    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }

    splitAndKeepLeft(trackId, elementId, currentTime);
  }, [selectedElements, tracks, currentTime, splitAndKeepLeft]);

  const handleSplitAndKeepRightCallback = useCallback(() => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one element");
      return;
    }

    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);
    const element = track?.elements.find((e) => e.id === elementId);

    if (!element) return;

    const effectiveStart = element.startTime;
    const effectiveEnd =
      element.startTime +
      (element.duration - element.trimStart - element.trimEnd);

    if (currentTime <= effectiveStart || currentTime >= effectiveEnd) {
      toast.error("Playhead must be within selected element");
      return;
    }

    splitAndKeepRight(trackId, elementId, currentTime);
  }, [selectedElements, tracks, currentTime, splitAndKeepRight]);

  const handleSeparateAudioCallback = useCallback(() => {
    if (selectedElements.length !== 1) {
      toast.error("Select exactly one media element to separate audio");
      return;
    }

    const { trackId, elementId } = selectedElements[0];
    const track = tracks.find((t) => t.id === trackId);

    if (!track || track.type !== "media") {
      toast.error("Select a media element to separate audio");
      return;
    }

    separateAudio(trackId, elementId);
  }, [selectedElements, tracks, separateAudio]);
};
