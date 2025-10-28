"use client";

import { useState } from "react";
import { TransitionUpIcon } from "../icons";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Progress } from "../ui/progress";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import {
  exportProject,
  getExportMimeType,
  getExportFileExtension,
  DEFAULT_EXPORT_OPTIONS,
} from "@/lib/export";
import { useProjectStore } from "@/stores/project-store";
import { Check, Copy, Download, RotateCcw, X } from "lucide-react";
import { ExportFormat, ExportQuality, ExportResult } from "@/types/export";
import { PropertyGroup } from "./properties-panel/property-item";

export function ExportButton() {
  const [isExportPopoverOpen, setIsExportPopoverOpen] = useState(false);
  const { activeProject } = useProjectStore();

  const handleExport = () => {
    setIsExportPopoverOpen(true);
  };

  const hasProject = !!activeProject;

  return (
    <Popover open={isExportPopoverOpen} onOpenChange={setIsExportPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1.5 bg-[#38BDF8] text-white rounded-md px-[0.12rem] py-[0.12rem] transition-all duration-200",
            hasProject
              ? "cursor-pointer hover:brightness-95"
              : "cursor-not-allowed opacity-50"
          )}
          onClick={hasProject ? handleExport : undefined}
          disabled={!hasProject}
          onKeyDown={(event) => {
            if (hasProject && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              handleExport();
            }
          }}
        >
          <div className="flex items-center gap-1.5 bg-linear-270 from-[#2567EC] to-[#37B6F7] rounded-[0.8rem] px-4 py-1 relative shadow-[0_1px_3px_0px_rgba(0,0,0,0.65)]">
            <TransitionUpIcon className="z-50" />
            <span className="text-[0.875rem] z-50">Export</span>
            <div className="absolute w-full h-full left-0 top-0 bg-linear-to-t from-white/0 to-white/50 z-10 rounded-[0.8rem] flex items-center justify-center">
              <div className="absolute w-[calc(100%-2px)] h-[calc(100%-2px)] top-[0.08rem] bg-linear-270 from-[#2567EC] to-[#37B6F7] z-50 rounded-[0.8rem]"></div>
            </div>
          </div>
        </button>
      </PopoverTrigger>
      {hasProject && <ExportPopover onOpenChange={setIsExportPopoverOpen} />}
    </Popover>
  );
}

function ExportPopover({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const { activeProject } = useProjectStore();
  const [format, setFormat] = useState<ExportFormat>(
    DEFAULT_EXPORT_OPTIONS.format
  );
  const [quality, setQuality] = useState<ExportQuality>(
    DEFAULT_EXPORT_OPTIONS.quality
  );
  const [includeAudio, setIncludeAudio] = useState<boolean>(
    DEFAULT_EXPORT_OPTIONS.includeAudio || true
  );
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const handleExport = async () => {
    if (!activeProject) return;

    setIsExporting(true);
    setProgress(0);
    setExportResult(null);

    const result = await exportProject({
      format,
      quality,
      fps: activeProject.fps,
      includeAudio,
      onProgress: setProgress,
      onCancel: () => false, // TODO: Add cancel functionality
    });

    setIsExporting(false);
    setExportResult(result);

    if (result.success && result.buffer) {
      // Download the file
      const mimeType = getExportMimeType(format);
      const extension = getExportFileExtension(format);
      const blob = new Blob([result.buffer], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeProject.name}${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onOpenChange(false);
      setExportResult(null);
      setProgress(0);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      onOpenChange(false);
      setExportResult(null);
      setProgress(0);
    }
  };

  return (
    <PopoverContent className="w-80 mr-4 flex flex-col gap-3 bg-background">
      <>
        {exportResult && !exportResult.success ? (
          <ExportError
            error={exportResult.error || "Unknown error occurred"}
            onRetry={handleExport}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className=" font-medium">
                {isExporting ? "Exporting project" : "Export project"}
              </h3>
              <Button variant="text" size="icon" onClick={handleClose}>
                <X className="!size-5 text-foreground/85" />
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {!isExporting && (
                <>
                  <div className="flex flex-col gap-3">
                    <PropertyGroup
                      title="Format"
                      titleClassName="text-sm"
                      defaultExpanded={false}
                    >
                      <RadioGroup
                        value={format}
                        onValueChange={(value) =>
                          setFormat(value as ExportFormat)
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mp4" id="mp4" />
                          <Label htmlFor="mp4">
                            MP4 (H.264) - Better compatibility
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="webm" id="webm" />
                          <Label htmlFor="webm">
                            WebM (VP9) - Smaller file size
                          </Label>
                        </div>
                      </RadioGroup>
                    </PropertyGroup>

                    <PropertyGroup
                      title="Quality"
                      titleClassName="text-sm"
                      defaultExpanded={false}
                    >
                      <RadioGroup
                        value={quality}
                        onValueChange={(value) =>
                          setQuality(value as ExportQuality)
                        }
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="low" />
                          <Label htmlFor="low">Low - Smallest file size</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <Label htmlFor="medium">Medium - Balanced</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="high" />
                          <Label htmlFor="high">High - Recommended</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="very_high" id="very_high" />
                          <Label htmlFor="very_high">
                            Very High - Largest file size
                          </Label>
                        </div>
                      </RadioGroup>
                    </PropertyGroup>

                    <PropertyGroup
                      title="Audio"
                      titleClassName="text-sm"
                      defaultExpanded={false}
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-audio"
                          checked={includeAudio}
                          onCheckedChange={(checked) =>
                            setIncludeAudio(!!checked)
                          }
                        />
                        <Label htmlFor="include-audio">
                          Include audio in export
                        </Label>
                      </div>
                    </PropertyGroup>
                  </div>

                  <Button onClick={handleExport} className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </Button>
                </>
              )}

              {isExporting && (
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <div className="text-center flex items-center justify-between">
                      <p className="text-sm text-muted-foreground mb-2">
                        {Math.round(progress * 100)}%
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">100%</p>
                    </div>
                    <Progress value={progress * 100} className="w-full" />
                  </div>

                  <Button
                    variant="outline"
                    className="rounded-md w-full"
                    onClick={() => {}}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </>
    </PopoverContent>
  );
}

function ExportError({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(error);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-red-400">Export failed</p>
        <p className="text-xs text-muted-foreground">
          {error}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={handleCopy}
        >
          {copied ? <Check className="text-green-500" /> : <Copy />}
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={onRetry}
        >
          <RotateCcw />
          Retry
        </Button>
      </div>
    </div>
  );
}
