import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Shield, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_TEXT_ELEMENT } from "@/constants/text-constants";
import { Language, LanguageSelect } from "@/components/language-select";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import { PropertyGroup } from "../../properties-panel/property-item";
import { extractTimelineAudio } from "@/lib/mediabunny-utils";
import {
  applyRippleCutsToMainTrack,
  autoStitchMainTrack,
  buildMergedTranscript,
  computeCutRangesForDeletedTokens,
  computeDeletedTokenIdsFromUpdatedText,
  DEFAULT_AUTO_STITCHING_PRESETS,
} from "@/lib/transcript-timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { useTranscriptStore } from "@/stores/transcript-store";
import type { MediaElement } from "@/types/timeline";
import type { StitchingPresetName } from "@/types/transcript";

export const languages: Language[] = [
  { code: "US", name: "English" },
  { code: "ES", name: "Spanish" },
  { code: "IT", name: "Italian" },
  { code: "FR", name: "French" },
  { code: "DE", name: "German" },
  { code: "PT", name: "Portuguese" },
  { code: "RU", name: "Russian" },
  { code: "JP", name: "Japanese" },
  { code: "CN", name: "Chinese" },
];

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
}

const PRIVACY_DIALOG_KEY = "opencut-transcription-privacy-accepted";

const getEffectiveEndTimeSeconds = (element: MediaElement) =>
  element.startTime + (element.duration - element.trimStart - element.trimEnd);

const mapTimelineSegmentsToMediaSegments = ({
  timelineSegments,
  mediaElements,
}: {
  timelineSegments: WhisperSegment[];
  mediaElements: MediaElement[];
}): Record<string, WhisperSegment[]> => {
  const sortedElements = [...mediaElements].sort(
    (left, right) => left.startTime - right.startTime,
  );

  const segmentsByMediaId: Record<string, WhisperSegment[]> = {};
  let elementIndex = 0;

  for (const segment of timelineSegments) {
    const midpointSeconds = (segment.start + segment.end) / 2;

    while (
      elementIndex < sortedElements.length &&
      midpointSeconds >= getEffectiveEndTimeSeconds(sortedElements[elementIndex])
    ) {
      elementIndex++;
    }

    const element = sortedElements[elementIndex];
    if (!element) continue;

    const elementTimelineStartSeconds = element.startTime;
    const elementTimelineEndSeconds = getEffectiveEndTimeSeconds(element);
    if (
      midpointSeconds < elementTimelineStartSeconds ||
      midpointSeconds >= elementTimelineEndSeconds
    ) {
      continue;
    }

    const sourceRangeStartSeconds = element.trimStart;
    const sourceRangeEndSeconds = element.duration - element.trimEnd;

    const relativeStartSeconds = segment.start - elementTimelineStartSeconds;
    const relativeEndSeconds = segment.end - elementTimelineStartSeconds;

    const sourceStartSeconds = Math.max(
      sourceRangeStartSeconds,
      sourceRangeStartSeconds + relativeStartSeconds,
    );
    const sourceEndSeconds = Math.min(
      sourceRangeEndSeconds,
      sourceRangeStartSeconds + relativeEndSeconds,
    );

    if (sourceEndSeconds <= sourceStartSeconds) continue;

    const nextSegment: WhisperSegment = {
      start: sourceStartSeconds,
      end: sourceEndSeconds,
      text: segment.text,
      avg_logprob: segment.avg_logprob,
    };

    segmentsByMediaId[element.mediaId] ||= [];
    segmentsByMediaId[element.mediaId].push(nextSegment);
  }

  return segmentsByMediaId;
};

export function Captions() {
  const [selectedCountry, setSelectedCountry] = useState("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [hasAcceptedPrivacy, setHasAcceptedPrivacy] = useState(false);
  const [scriptText, setScriptText] = useState("");
  const [isScriptDirty, setIsScriptDirty] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { insertTrackAt, addElementToTrack, tracks, replaceTrackElements } =
    useTimelineStore();
  const { transcriptsByMediaId, setTranscriptFromWhisperSegments, clearTranscripts } =
    useTranscriptStore();

  const mergedTranscript = useMemo(
    () => buildMergedTranscript({ tracks, transcriptsByMediaId }),
    [tracks, transcriptsByMediaId],
  );

  useEffect(() => {
    const hasAccepted = localStorage.getItem(PRIVACY_DIALOG_KEY) === "true";
    setHasAcceptedPrivacy(hasAccepted);
  }, []);

  useEffect(() => {
    if (isScriptDirty) return;
    setScriptText(mergedTranscript.text);
  }, [isScriptDirty, mergedTranscript.text]);

  const handleGenerateTranscript = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setProcessingStep("Extracting audio…");

      const audioBlob = await extractTimelineAudio();

      setProcessingStep("Transcribing…");

      const audioFile = new File([audioBlob], "timeline_audio.wav", {
        type: audioBlob.type || "audio/wav",
      });

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append(
        "language",
        selectedCountry === "auto" ? "auto" : selectedCountry.toLowerCase(),
      );

      const transcriptionResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const responseError = await transcriptionResponse.json().catch(() => null);
        throw new Error(responseError?.message || "Transcription failed");
      }

      const { segments } = (await transcriptionResponse.json()) as {
        segments: WhisperSegment[];
        language?: string;
        text?: string;
      };

      clearTranscripts();

      const mainTrack = tracks.find((track) => track.isMain);
      const mainTrackElements = (mainTrack?.elements || [])
        .filter((element): element is MediaElement => element.type === "media")
        .filter((element) => !element.hidden);

      const segmentsByMediaId = mapTimelineSegmentsToMediaSegments({
        timelineSegments: segments,
        mediaElements: mainTrackElements,
      });

      for (const [mediaId, mediaSegments] of Object.entries(segmentsByMediaId)) {
        setTranscriptFromWhisperSegments({
          mediaId,
          segments: mediaSegments,
        });
      }

      setIsScriptDirty(false);

      const shortCaptions: Array<{
        text: string;
        startTime: number;
        duration: number;
      }> = [];

      let globalEndTime = 0;

      segments.forEach((segment) => {
        const words = segment.text.trim().split(/\s+/);
        const segmentDuration = segment.end - segment.start;
        const wordsPerSecond = words.length / Math.max(0.001, segmentDuration);

        const chunks: string[] = [];
        for (let index = 0; index < words.length; index += 3) {
          chunks.push(words.slice(index, index + 3).join(" "));
        }

        let chunkStartTime = segment.start;
        chunks.forEach((chunk) => {
          const chunkWords = chunk.split(/\s+/).length;
          const chunkDuration = Math.max(0.8, chunkWords / wordsPerSecond);

          let adjustedStartTime = chunkStartTime;
          if (adjustedStartTime < globalEndTime) {
            adjustedStartTime = globalEndTime;
          }

          shortCaptions.push({
            text: chunk,
            startTime: adjustedStartTime,
            duration: chunkDuration,
          });

          globalEndTime = adjustedStartTime + chunkDuration;
          chunkStartTime += chunkDuration;
        });
      });

      const captionTrackId = insertTrackAt("text", 0);
      shortCaptions.forEach((caption, index) => {
        addElementToTrack(captionTrackId, {
          ...DEFAULT_TEXT_ELEMENT,
          name: `Caption ${index + 1}`,
          content: caption.text,
          duration: caption.duration,
          startTime: caption.startTime,
          fontSize: 65,
          fontWeight: "bold",
        });
      });
    } catch (caught) {
      console.error("Transcription failed:", caught);
      setError(caught instanceof Error ? caught.message : "Transcription failed");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  const handleApplyTranscriptEdits = () => {
    setError(null);

    if (mergedTranscript.tokens.length === 0) {
      setError("Generate a transcript first.");
      return;
    }

    const deletionResult = computeDeletedTokenIdsFromUpdatedText({
      mergedTranscript,
      updatedText: scriptText,
    });

    if (!deletionResult.success) {
      setError(deletionResult.error);
      return;
    }

    const cutRanges = computeCutRangesForDeletedTokens({
      mergedTranscript,
      deletedTokenIds: deletionResult.deletedTokenIds,
      paddingSeconds: 0.04,
    });

    if (cutRanges.length === 0) {
      setError("No deletions detected.");
      return;
    }

    const mainTrack = tracks.find((track) => track.isMain);
    if (!mainTrack) {
      setError("Main track not found.");
      return;
    }

    const stitchedElements = applyRippleCutsToMainTrack({ tracks, cutRanges });
    const nextTracks = tracks.map((track) =>
      track.id === mainTrack.id ? { ...track, elements: stitchedElements } : track,
    );

    const nextMergedTranscript = buildMergedTranscript({
      tracks: nextTracks,
      transcriptsByMediaId,
    });

    replaceTrackElements(mainTrack.id, stitchedElements);
    setIsScriptDirty(false);
    setScriptText(nextMergedTranscript.text);
  };

  const handleAutoStitch = (preset: StitchingPresetName) => {
    setError(null);

    const mainTrack = tracks.find((track) => track.isMain);
    if (!mainTrack) {
      setError("Main track not found.");
      return;
    }

    const stitchedElements = autoStitchMainTrack({
      tracks,
      transcriptsByMediaId,
      settings: DEFAULT_AUTO_STITCHING_PRESETS[preset],
    });

    const nextTracks = tracks.map((track) =>
      track.id === mainTrack.id ? { ...track, elements: stitchedElements } : track,
    );

    const nextMergedTranscript = buildMergedTranscript({
      tracks: nextTracks,
      transcriptsByMediaId,
    });

    replaceTrackElements(mainTrack.id, stitchedElements);
    setIsScriptDirty(false);
    setScriptText(nextMergedTranscript.text);
  };

  return (
    <BaseView ref={containerRef} className="flex flex-col gap-6">
      <PropertyGroup title="Language">
        <LanguageSelect
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
          containerRef={containerRef}
          languages={languages}
        />
      </PropertyGroup>

      <div className="flex flex-col gap-4">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          className="w-full"
          onClick={() => {
            if (hasAcceptedPrivacy) {
              handleGenerateTranscript();
            } else {
              setShowPrivacyDialog(true);
            }
          }}
          disabled={isProcessing}
        >
          {isProcessing && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          {isProcessing ? processingStep : "Generate transcript"}
        </Button>

        <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Audio Processing Notice
              </DialogTitle>
              <DialogDescription asChild className="space-y-3">
                <div>
                  <p>
                    To generate captions, your timeline audio is sent to Gemini
                    2.5 Flash for speech-to-text transcription.
                  </p>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-start gap-2">
                      <Upload className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">
                        Audio is uploaded to the transcription provider (Google
                        Gemini) for processing
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Trash2 className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">
                        This app processes audio in-memory and does not store it
                        on our servers
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm">
                        Only use audio you have permission to transcribe
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    By continuing, you agree to send your audio to the
                    transcription provider for processing.
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPrivacyDialog(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  localStorage.setItem(PRIVACY_DIALOG_KEY, "true");
                  setHasAcceptedPrivacy(true);
                  setShowPrivacyDialog(false);
                  handleGenerateTranscript();
                }}
                disabled={isProcessing}
              >
                Continue & Generate Captions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <PropertyGroup title="Transcript-Driven Edits" defaultExpanded={false}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              onClick={() => handleAutoStitch("tight")}
              disabled={isProcessing || mergedTranscript.tokens.length === 0}
            >
              Tight
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAutoStitch("balanced")}
              disabled={isProcessing || mergedTranscript.tokens.length === 0}
            >
              Balanced
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAutoStitch("loose")}
              disabled={isProcessing || mergedTranscript.tokens.length === 0}
            >
              Loose
            </Button>
          </div>

          <Textarea
            placeholder="Generate a transcript to edit it here…"
            value={scriptText}
            onChange={(event) => {
              setIsScriptDirty(true);
              setScriptText(event.target.value);
            }}
            rows={8}
          />

          <Button
            onClick={handleApplyTranscriptEdits}
            disabled={isProcessing || mergedTranscript.tokens.length === 0}
          >
            Apply Deletions To Timeline
          </Button>
        </div>
      </PropertyGroup>
    </BaseView>
  );
}
