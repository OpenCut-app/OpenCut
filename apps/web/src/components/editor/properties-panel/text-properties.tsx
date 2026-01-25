import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { PanelBaseView } from "@/components/editor/panel-base-view";
import {
  TEXT_PROPERTIES_TABS,
  isTextPropertiesTab,
  useTextPropertiesStore,
} from "@/stores/text-properties-store";
import {
  PropertyItem,
  PropertyItemLabel,
  PropertyItemValue,
} from "./property-item";
import { ColorPicker } from "@/components/ui/color-picker";
import { cn, uppercase } from "@/lib/utils";
import { Grid2x2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TextSelectionTarget {
  trackId: string;
  elementId: string;
}

interface TextPropertiesProps {
  elements: TextElement[];
  targets: TextSelectionTarget[];
  label?: string;
}

export function TextProperties({
  elements,
  targets,
  label,
}: TextPropertiesProps) {
  const { updateTextElement, updateTextElements } = useTimelineStore();
  const { activeTab, setActiveTab } = useTextPropertiesStore();
  const containerRef = useRef<HTMLDivElement>(null);
  if (elements.length === 0 || targets.length === 0) return null;
  const primaryElement = elements[0];
  const isMultiSelect = targets.length > 1;

  const applyTextUpdates = (
    updates: Parameters<typeof updateTextElement>[2]
  ) => {
    if (!primaryElement) return;
    if (isMultiSelect) {
      updateTextElements(targets, updates);
      return;
    }

    const target = targets[0];
    if (!target) return;
    updateTextElement(target.trackId, target.elementId, updates);
  };

  // Local state for input values to allow temporary empty/invalid states
  const [fontSizeInput, setFontSizeInput] = useState(
    primaryElement.fontSize.toString()
  );
  const [opacityInput, setOpacityInput] = useState(
    Math.round(primaryElement.opacity * 100).toString()
  );
  const boxShadowOffset = Math.max(
    primaryElement.boxShadowOffsetX ?? 0,
    primaryElement.boxShadowOffsetY ?? 0
  );
  const boxShadowOpacityPercent = Math.round(
    Math.max(0, Math.min(1, primaryElement.boxShadowOpacity ?? 0.6)) * 100
  );

  // Track the last selected color for toggling
  const lastSelectedColor = useRef("#000000");

  useEffect(() => {
    setFontSizeInput(primaryElement.fontSize.toString());
    setOpacityInput(Math.round(primaryElement.opacity * 100).toString());
    if (
      primaryElement.backgroundColor &&
      primaryElement.backgroundColor !== "transparent"
    ) {
      lastSelectedColor.current = primaryElement.backgroundColor;
    }
  }, [
    primaryElement.id,
    primaryElement.fontSize,
    primaryElement.opacity,
    primaryElement.backgroundColor,
  ]);

  const parseAndValidateNumber = (
    value: string,
    min: number,
    max: number,
    fallback: number
  ): number => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  };

  const handleFontSizeChange = (value: string) => {
    setFontSizeInput(value);

    if (value.trim() !== "") {
      const fontSize = parseAndValidateNumber(
        value,
        8,
        300,
        primaryElement.fontSize
      );
      applyTextUpdates({ fontSize });
    }
  };

  const handleFontSizeBlur = () => {
    const fontSize = parseAndValidateNumber(
      fontSizeInput,
      8,
      300,
      primaryElement.fontSize
    );
    setFontSizeInput(fontSize.toString());
    applyTextUpdates({ fontSize });
  };

  const handleOpacityChange = (value: string) => {
    setOpacityInput(value);

    if (value.trim() !== "") {
      const opacityPercent = parseAndValidateNumber(
        value,
        0,
        100,
        Math.round(primaryElement.opacity * 100)
      );
      applyTextUpdates({ opacity: opacityPercent / 100 });
    }
  };

  const handleOpacityBlur = () => {
    const opacityPercent = parseAndValidateNumber(
      opacityInput,
      0,
      100,
      Math.round(primaryElement.opacity * 100)
    );
    setOpacityInput(opacityPercent.toString());
    applyTextUpdates({ opacity: opacityPercent / 100 });
  };

  // Update last selected color when a new color is picked
  const handleColorChange = (color: string) => {
    if (color !== "transparent") {
      lastSelectedColor.current = color;
    }
    applyTextUpdates({ backgroundColor: color });
  };

  // Toggle between transparent and last selected color
  const handleTransparentToggle = (isTransparent: boolean) => {
    const newColor = isTransparent ? "transparent" : lastSelectedColor.current;
    applyTextUpdates({ backgroundColor: newColor });
  };

  return (
    <PanelBaseView
      defaultTab="transform"
      value={activeTab}
      onValueChange={(v) => {
        if (isTextPropertiesTab(v)) setActiveTab(v);
      }}
      ref={containerRef}
      tabs={TEXT_PROPERTIES_TABS.map((t) => ({
        value: t.value,
        label: t.label,
        content:
          t.value === "transform" ? (
            <div className="space-y-6" />
          ) : (
            <div className="space-y-6">
              {label ? (
                <div className="text-xs text-muted-foreground">
                  {label}
                  {targets.length > 1 ? ` (${targets.length} selected)` : null}
                </div>
              ) : null}
              <Textarea
                placeholder={isMultiSelect ? "Multiple selected" : "Name"}
                value={isMultiSelect ? "" : primaryElement.content}
                disabled={isMultiSelect}
                className="min-h-18 resize-none bg-panel-accent"
                onChange={(e) => applyTextUpdates({ content: e.target.value })}
              />
              <PropertyItem direction="column">
                <PropertyItemLabel>Font</PropertyItemLabel>
                <PropertyItemValue>
                  <FontPicker
                    defaultValue={primaryElement.fontFamily}
                    onValueChange={(value: FontFamily) =>
                      applyTextUpdates({ fontFamily: value })
                    }
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Style</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={
                        primaryElement.fontWeight === "bold"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        applyTextUpdates({
                          fontWeight:
                            primaryElement.fontWeight === "bold"
                              ? "normal"
                              : "bold",
                        })
                      }
                      className="h-8 px-3 font-bold"
                    >
                      B
                    </Button>
                    <Button
                      variant={
                        primaryElement.fontStyle === "italic"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        applyTextUpdates({
                          fontStyle:
                            primaryElement.fontStyle === "italic"
                              ? "normal"
                              : "italic",
                        })
                      }
                      className="h-8 px-3 italic"
                    >
                      I
                    </Button>
                    <Button
                      variant={
                        primaryElement.textDecoration === "underline"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        applyTextUpdates({
                          textDecoration:
                            primaryElement.textDecoration === "underline"
                              ? "none"
                              : "underline",
                        })
                      }
                      className="h-8 px-3 underline"
                    >
                      U
                    </Button>
                    <Button
                      variant={
                        primaryElement.textDecoration === "line-through"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        applyTextUpdates({
                          textDecoration:
                            primaryElement.textDecoration === "line-through"
                              ? "none"
                              : "line-through",
                        })
                      }
                      className="h-8 px-3 line-through"
                    >
                      S
                    </Button>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Font size</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[primaryElement.fontSize]}
                      min={8}
                      max={300}
                      step={1}
                      onValueChange={([value]) => {
                        applyTextUpdates({ fontSize: value });
                        setFontSizeInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={fontSizeInput}
                      min={8}
                      max={300}
                      onChange={(e) => handleFontSizeChange(e.target.value)}
                      onBlur={handleFontSizeBlur}
                      className="w-12 px-2 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Color</PropertyItemLabel>
                <PropertyItemValue>
                  <ColorPicker
                    value={uppercase(
                      (primaryElement.color || "FFFFFF").replace("#", "")
                    )}
                    onChange={(color) => {
                      applyTextUpdates({ color: `#${color}` });
                    }}
                    containerRef={containerRef}
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Opacity</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[primaryElement.opacity * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        applyTextUpdates({ opacity: value / 100 });
                        setOpacityInput(value.toString());
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      value={opacityInput}
                      min={0}
                      max={100}
                      onChange={(e) => handleOpacityChange(e.target.value)}
                      onBlur={handleOpacityBlur}
                      className="w-12 !text-xs h-7 rounded-sm text-center bg-panel-accent
               [appearance:textfield]
               [&::-webkit-outer-spin-button]:appearance-none
               [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Background</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <ColorPicker
                      value={uppercase(
                        primaryElement.backgroundColor === "transparent"
                          ? lastSelectedColor.current.replace("#", "")
                          : (
                              primaryElement.backgroundColor || "#000000"
                            ).replace("#", "")
                      )}
                      onChange={(color) => handleColorChange(`#${color}`)}
                      containerRef={containerRef}
                      className={
                        primaryElement.backgroundColor === "transparent"
                          ? "opacity-50 pointer-events-none"
                          : ""
                      }
                    />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleTransparentToggle(
                              primaryElement.backgroundColor !== "transparent"
                            )
                          }
                          className="size-9 rounded-full bg-panel-accent p-0 overflow-hidden"
                        >
                          <Grid2x2
                            className={cn(
                              "text-foreground",
                              primaryElement.backgroundColor ===
                                "transparent" && "text-primary"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Transparent background</TooltipContent>
                    </Tooltip>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Background radius</PropertyItemLabel>
                <PropertyItemValue>
                  <Slider
                    value={[primaryElement.backgroundRadius ?? 0]}
                    min={0}
                    max={64}
                    step={1}
                    onValueChange={([value]) =>
                      applyTextUpdates({ backgroundRadius: value })
                    }
                    className="w-full"
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Background padding</PropertyItemLabel>
                <PropertyItemValue>
                  <Slider
                    value={[primaryElement.backgroundPaddingX ?? 8]}
                    min={0}
                    max={40}
                    step={1}
                    onValueChange={([value]) =>
                      applyTextUpdates({
                        backgroundPaddingX: value,
                        backgroundPaddingY: Math.max(0, Math.round(value / 2)),
                      })
                    }
                    className="w-full"
                  />
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Outline</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[primaryElement.outlineWidth ?? 0]}
                      min={0}
                      max={20}
                      step={1}
                      onValueChange={([value]) =>
                        applyTextUpdates({ outlineWidth: value })
                      }
                      className="w-full"
                    />
                    <ColorPicker
                      value={uppercase(
                        (primaryElement.outlineColor || "#000000").replace(
                          "#",
                          ""
                        )
                      )}
                      onChange={(color) =>
                        applyTextUpdates({ outlineColor: `#${color}` })
                      }
                      containerRef={containerRef}
                    />
                  </div>
                </PropertyItemValue>
              </PropertyItem>
              <PropertyItem direction="column">
                <PropertyItemLabel>Box shadow</PropertyItemLabel>
                <PropertyItemValue>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-14 text-xs text-muted-foreground">
                        Offset
                      </div>
                      <Slider
                        value={[boxShadowOffset]}
                        min={0}
                        max={40}
                        step={1}
                        onValueChange={([value]) =>
                          applyTextUpdates({
                            boxShadowOffsetX: value,
                            boxShadowOffsetY: value,
                          })
                        }
                        className="flex-1"
                      />
                      <ColorPicker
                        value={uppercase(
                          (primaryElement.boxShadowColor || "#000000").replace(
                            "#",
                            ""
                          )
                        )}
                        onChange={(color) =>
                          applyTextUpdates({ boxShadowColor: `#${color}` })
                        }
                        containerRef={containerRef}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-14 text-xs text-muted-foreground">
                        Opacity
                      </div>
                      <Slider
                        value={[boxShadowOpacityPercent]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([value]) =>
                          applyTextUpdates({ boxShadowOpacity: value / 100 })
                        }
                        className="flex-1"
                      />
                      <div className="w-10 text-xs tabular-nums text-muted-foreground text-right">
                        {boxShadowOpacityPercent}%
                      </div>
                    </div>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ),
      }))}
    />
  );
}
