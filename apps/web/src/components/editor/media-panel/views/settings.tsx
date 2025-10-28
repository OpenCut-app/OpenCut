"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
  PropertyGroup,
} from "../../properties-panel/property-item";
import { FPS_PRESETS } from "@/constants/timeline-constants";
import { useProjectStore } from "@/stores/project-store";
import type { BlurIntensity } from "@/types/project";
import { useEditorStore } from "@/stores/editor-store";
import { useAspectRatio } from "@/hooks/use-aspect-ratio";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { colors } from "@/data/colors/solid";
import { patternCraftGradients } from "@/data/colors/pattern-craft";
import { PipetteIcon, PlusIcon } from "lucide-react";
import { useMemo, memo, useCallback } from "react";
import { syntaxUIGradients } from "@/data/colors/syntax-ui";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function SettingsView() {
  return <ProjectSettingsTabs />;
}

function ProjectSettingsTabs() {
  return (
    <BaseView
      defaultTab="project-info"
      tabs={[
        {
          value: "project-info",
          label: "Project info",
          content: (
            <div className="p-5">
              <ProjectInfoView />
            </div>
          ),
        },
        {
          value: "background",
          label: "Background",
          content: (
            <div className="flex flex-col justify-between h-full">
              <div className="flex-1 p-5">
                <BackgroundView />
              </div>
              <div className="flex flex-col sticky -bottom-0 bg-panel/85 backdrop-blur-lg">
                <Separator />
                <Button className="w-fit h-auto p-5 py-4 !bg-transparent shadow-none text-muted-foreground hover:text-foreground/85 text-xs">
                  Custom background
                  <PlusIcon />
                </Button>
              </div>

              {/* Another UI, looks so beautiful i don't wanna remove it */}
              {/* <div className="flex flex-col justify-center items-center pb-5 sticky bottom-0">
                <Button className="w-fit h-auto gap-1.5 px-3.5 py-1.5 bg-foreground hover:bg-foreground/85 text-background rounded-full">
                  <span className="text-sm">Custom</span>
                  <PlusIcon className="" />
                </Button>
              </div> */}
            </div>
          ),
        },
      ]}
      className="flex flex-col justify-between h-full p-0"
    />
  );
}

function ProjectInfoView() {
  const { activeProject, updateProjectFps, updateCanvasSize } =
    useProjectStore();
  const { canvasPresets } = useEditorStore();
  const { getDisplayName } = useAspectRatio();

  const handleAspectRatioChange = (value: string) => {
    const preset = canvasPresets.find((p) => p.name === value);
    if (preset) {
      updateCanvasSize(
        { width: preset.width, height: preset.height },
        "preset"
      );
    }
  };

  const handleFpsChange = (value: string) => {
    const fps = parseFloat(value);
    updateProjectFps(fps);
  };

  return (
    <div className="flex flex-col gap-4">
      <PropertyItem direction="column">
        <PropertyItemLabel>Name</PropertyItemLabel>
        <PropertyItemValue>
          {activeProject?.name || "Untitled project"}
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Aspect ratio</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={getDisplayName()}
            onValueChange={handleAspectRatioChange}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select an aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              {canvasPresets.map((preset) => (
                <SelectItem key={preset.name} value={preset.name}>
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>

      <PropertyItem direction="column">
        <PropertyItemLabel>Frame rate</PropertyItemLabel>
        <PropertyItemValue>
          <Select
            value={(activeProject?.fps || 30).toString()}
            onValueChange={handleFpsChange}
          >
            <SelectTrigger className="bg-panel-accent">
              <SelectValue placeholder="Select a frame rate" />
            </SelectTrigger>
            <SelectContent>
              {FPS_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PropertyItemValue>
      </PropertyItem>
    </div>
  );
}

const BlurPreview = memo(
  ({
    blur,
    isSelected,
    onSelect,
  }: {
    blur: { label: string; value: number };
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <div
      className={cn(
        "w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary relative overflow-hidden",
        isSelected && "border-2 border-primary"
      )}
      onClick={onSelect}
    >
      <Image
        src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        alt={`Blur preview ${blur.label}`}
        fill
        className="object-cover"
        style={{ filter: `blur(${blur.value}px)` }}
        loading="eager"
      />
      <div className="absolute bottom-1 left-1 right-1 text-center">
        <span className="text-xs text-white bg-black/50 px-1 rounded">
          {blur.label}
        </span>
      </div>
    </div>
  )
);

BlurPreview.displayName = "BlurPreview";

const BackgroundPreviews = memo(
  ({
    backgrounds,
    currentBackgroundColor,
    isColorBackground,
    handleColorSelect,
    useBackgroundColor = false,
  }: {
    backgrounds: string[];
    currentBackgroundColor: string;
    isColorBackground: boolean;
    handleColorSelect: (bg: string) => void;
    useBackgroundColor?: boolean;
  }) => {
    return useMemo(
      () =>
        backgrounds.map((bg, index) => (
          <div
            key={`${index}-${bg}`}
            className={cn(
              "w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary",
              isColorBackground &&
                bg === currentBackgroundColor &&
                "border-2 border-primary"
            )}
            style={
              useBackgroundColor
                ? { backgroundColor: bg }
                : {
                    background: bg,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
            }
            onClick={() => handleColorSelect(bg)}
          />
        )),
      [
        backgrounds,
        isColorBackground,
        currentBackgroundColor,
        handleColorSelect,
        useBackgroundColor,
      ]
    );
  }
);

BackgroundPreviews.displayName = "BackgroundPreviews";

function BackgroundView() {
  const { activeProject, updateBackgroundType } = useProjectStore();

  const blurLevels = useMemo<Array<{ label: string; value: BlurIntensity }>>(
    () => [
      { label: "Light", value: 4 },
      { label: "Medium", value: 8 },
      { label: "Heavy", value: 18 },
    ],
    []
  );

  const handleBlurSelect = useCallback(
    async (blurIntensity: BlurIntensity) => {
      await updateBackgroundType("blur", { blurIntensity });
    },
    [updateBackgroundType]
  );

  const handleColorSelect = useCallback(
    async (color: string) => {
      await updateBackgroundType("color", { backgroundColor: color });
    },
    [updateBackgroundType]
  );

  const currentBlurIntensity = activeProject?.blurIntensity || 8;
  const isBlurBackground = activeProject?.backgroundType === "blur";
  const currentBackgroundColor = activeProject?.backgroundColor || "#000000";
  const isColorBackground = activeProject?.backgroundType === "color";

  const blurPreviews = useMemo(
    () =>
      blurLevels.map((blur) => (
        <BlurPreview
          key={blur.value}
          blur={blur}
          isSelected={isBlurBackground && currentBlurIntensity === blur.value}
          onSelect={() => handleBlurSelect(blur.value)}
        />
      )),
    [blurLevels, isBlurBackground, currentBlurIntensity, handleBlurSelect]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      <PropertyGroup title="Blur" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">{blurPreviews}</div>
      </PropertyGroup>

      <PropertyGroup title="Colors" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <div className="w-full aspect-square rounded-sm cursor-pointer border border-foreground/15 hover:border-primary flex items-center justify-center">
            <PipetteIcon className="size-4" />
          </div>
          <BackgroundPreviews
            backgrounds={colors}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
            useBackgroundColor={true}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Pattern craft" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <BackgroundPreviews
            backgrounds={patternCraftGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>

      <PropertyGroup title="Syntax UI" defaultExpanded={false}>
        <div className="grid grid-cols-4 gap-2 w-full">
          <BackgroundPreviews
            backgrounds={syntaxUIGradients}
            currentBackgroundColor={currentBackgroundColor}
            isColorBackground={isColorBackground}
            handleColorSelect={handleColorSelect}
          />
        </div>
      </PropertyGroup>
    </div>
  );
}
