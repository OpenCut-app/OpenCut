import { Textarea } from "@/components/ui/textarea";
import { FontPicker } from "@/components/ui/font-picker";
import { FontFamily } from "@/constants/font-constants";
import { TextElement } from "@/types/timeline";
import { useTimelineStore } from "@/stores/timeline-store";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
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

export function TextProperties({
  element,
  trackId,
}: {
  element: TextElement;
  trackId: string;
}) {
  const { updateTextElement } = useTimelineStore();
  const { activeTab, setActiveTab } = useTextPropertiesStore();
  const containerRef = useRef<HTMLDivElement>(null);
  // Local state for input values to allow temporary empty/invalid states
  const [fontSizeInput, setFontSizeInput] = useState(
    element.fontSize.toString()
  );
  const [opacityInput, setOpacityInput] = useState(
    Math.round(element.opacity * 100).toString()
  );

  // Track the last selected color for toggling
  const lastSelectedColor = useRef("#000000");

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
      const fontSize = parseAndValidateNumber(value, 8, 300, element.fontSize);
      updateTextElement(trackId, element.id, { fontSize });
    }
  };

  const handleFontSizeBlur = () => {
    const fontSize = parseAndValidateNumber(
      fontSizeInput,
      8,
      300,
      element.fontSize
    );
    setFontSizeInput(fontSize.toString());
    updateTextElement(trackId, element.id, { fontSize });
  };

  const handleOpacityChange = (value: string) => {
    setOpacityInput(value);

    if (value.trim() !== "") {
      const opacityPercent = parseAndValidateNumber(
        value,
        0,
        100,
        Math.round(element.opacity * 100)
      );
      updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
    }
  };

  const handleOpacityBlur = () => {
    const opacityPercent = parseAndValidateNumber(
      opacityInput,
      0,
      100,
      Math.round(element.opacity * 100)
    );
    setOpacityInput(opacityPercent.toString());
    updateTextElement(trackId, element.id, { opacity: opacityPercent / 100 });
  };

  // Update last selected color when a new color is picked
  const handleColorChange = (color: string) => {
    if (color !== "transparent") {
      lastSelectedColor.current = color;
    }
    updateTextElement(trackId, element.id, { backgroundColor: color });
  };

  // Toggle between transparent and last selected color
  const handleTransparentToggle = (isTransparent: boolean) => {
    const newColor = isTransparent ? "transparent" : lastSelectedColor.current;
    updateTextElement(trackId, element.id, { backgroundColor: newColor });
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
            <div className="space-y-6"></div>
          ) : (
            <div className="space-y-6">
              <Textarea
                placeholder="Name"
                defaultValue={element.content}
                className="min-h-18 resize-none bg-panel-accent"
                onChange={(e) =>
                  updateTextElement(trackId, element.id, {
                    content: e.target.value,
                  })
                }
              />
              <PropertyItem direction="column">
                <PropertyItemLabel>Font</PropertyItemLabel>
                <PropertyItemValue>
                  <FontPicker
                    defaultValue={element.fontFamily}
                    onValueChange={(value: FontFamily) =>
                      updateTextElement(trackId, element.id, {
                        fontFamily: value,
                      })
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
                        element.fontWeight === "bold" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontWeight:
                            element.fontWeight === "bold" ? "normal" : "bold",
                        })
                      }
                      className="h-8 px-3 font-bold"
                    >
                      B
                    </Button>
                    <Button
                      variant={
                        element.fontStyle === "italic" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          fontStyle:
                            element.fontStyle === "italic"
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
                        element.textDecoration === "underline"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "underline"
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
                        element.textDecoration === "line-through"
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateTextElement(trackId, element.id, {
                          textDecoration:
                            element.textDecoration === "line-through"
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
                      value={[element.fontSize]}
                      min={8}
                      max={300}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          fontSize: value,
                        });
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
                      (element.color || "FFFFFF").replace("#", "")
                    )}
                    onChange={(color) => {
                      updateTextElement(trackId, element.id, {
                        color: `#${color}`,
                      });
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
                      value={[element.opacity * 100]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([value]) => {
                        updateTextElement(trackId, element.id, {
                          opacity: value / 100,
                        });
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
                        element.backgroundColor === "transparent"
                          ? lastSelectedColor.current.replace("#", "")
                          : (element.backgroundColor || "#000000").replace(
                              "#",
                              ""
                            )
                      )}
                      onChange={(color) => handleColorChange(`#${color}`)}
                      containerRef={containerRef}
                      className={
                        element.backgroundColor === "transparent"
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
                              element.backgroundColor !== "transparent"
                            )
                          }
                          className="size-9 rounded-full bg-panel-accent p-0 overflow-hidden"
                        >
                          <Grid2x2
                            className={cn(
                              "text-foreground",
                              element.backgroundColor === "transparent" &&
                                "text-primary"
                            )}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Transparent background</TooltipContent>
                    </Tooltip>
                  </div>
                </PropertyItemValue>
              </PropertyItem>
            </div>
          ),
      }))}
    />
  );
}
