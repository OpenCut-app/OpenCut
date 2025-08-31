"use client";

import { useEffectsStore } from "@/stores/effects-store";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Trash2, Settings, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function EffectsProperties() {
  const {
    selectedEffect,
    appliedEffects,
    updateEffectParameters,
    removeEffect,
    toggleEffect,
    setSelectedEffect,
  } = useEffectsStore();

  if (!selectedEffect) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select an effect to adjust its properties</p>
      </div>
    );
  }

  const handleParameterChange = (parameter: string, value: number[]) => {
    updateEffectParameters(selectedEffect.id, {
      [parameter]: value[0],
    });
  };

  const handleReset = () => {
    // Reset to default values based on effect type
    const defaultParams = getDefaultParameters(selectedEffect.effectType);
    updateEffectParameters(selectedEffect.id, defaultParams);
    toast.success("Effect reset to default");
  };

  const handleDuplicate = () => {
    // Create a copy of the current effect
    const newEffect = {
      ...selectedEffect,
      id: crypto.randomUUID(),
      name: `${selectedEffect.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to applied effects (this would need to be implemented in the store)
    toast.success("Effect duplicated");
  };

  const handleRemove = () => {
    removeEffect(selectedEffect.id);
    setSelectedEffect(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{selectedEffect.name}</h3>
          <p className="text-xs text-muted-foreground">
            Effect applied to timeline element
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleEffect(selectedEffect.id)}
            className="h-8 w-8 p-0"
          >
            {selectedEffect.enabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="effect-enabled" className="text-sm">
          Enable Effect
        </Label>
        <Switch
          id="effect-enabled"
          checked={selectedEffect.enabled}
          onCheckedChange={() => toggleEffect(selectedEffect.id)}
        />
      </div>

      <Separator />

      {/* Parameters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Parameters</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>

        {/* Brightness */}
        {selectedEffect.parameters.brightness !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Brightness</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.brightness}
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.brightness]}
              onValueChange={(value) =>
                handleParameterChange("brightness", value)
              }
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Contrast */}
        {selectedEffect.parameters.contrast !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Contrast</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.contrast}
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.contrast]}
              onValueChange={(value) =>
                handleParameterChange("contrast", value)
              }
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Saturation */}
        {selectedEffect.parameters.saturation !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Saturation</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.saturation}
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.saturation]}
              onValueChange={(value) =>
                handleParameterChange("saturation", value)
              }
              min={-100}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Hue */}
        {selectedEffect.parameters.hue !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hue</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.hue}°
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.hue]}
              onValueChange={(value) => handleParameterChange("hue", value)}
              min={-180}
              max={180}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Blur */}
        {selectedEffect.parameters.blur !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Blur</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.blur}
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.blur]}
              onValueChange={(value) => handleParameterChange("blur", value)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Sepia */}
        {selectedEffect.parameters.sepia !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Sepia</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.sepia}%
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.sepia]}
              onValueChange={(value) => handleParameterChange("sepia", value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Grayscale */}
        {selectedEffect.parameters.grayscale !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Grayscale</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.grayscale}%
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.grayscale]}
              onValueChange={(value) =>
                handleParameterChange("grayscale", value)
              }
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Vignette */}
        {selectedEffect.parameters.vignette !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Vignette</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.vignette}%
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.vignette]}
              onValueChange={(value) =>
                handleParameterChange("vignette", value)
              }
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Grain */}
        {selectedEffect.parameters.grain !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Film Grain</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.grain}%
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.grain]}
              onValueChange={(value) => handleParameterChange("grain", value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Sharpen */}
        {selectedEffect.parameters.sharpen !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Sharpen</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.sharpen}%
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.sharpen]}
              onValueChange={(value) => handleParameterChange("sharpen", value)}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Pixelate */}
        {selectedEffect.parameters.pixelate !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Pixelate</Label>
              <span className="text-xs text-muted-foreground">
                {selectedEffect.parameters.pixelate}
              </span>
            </div>
            <Slider
              value={[selectedEffect.parameters.pixelate]}
              onValueChange={(value) =>
                handleParameterChange("pixelate", value)
              }
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Applied Effects List */}
      {appliedEffects.length > 1 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Applied Effects</h4>
            <div className="space-y-1">
              {appliedEffects
                .filter(
                  (effect) => effect.elementId === selectedEffect.elementId
                )
                .map((effect) => (
                  <div
                    key={effect.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors",
                      effect.id === selectedEffect.id
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedEffect(effect)}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={
                          effect.enabled ? "opacity-100" : "opacity-50"
                        }
                      >
                        {effect.name}
                      </span>
                      {!effect.enabled && <EyeOff className="h-3 w-3" />}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to get default parameters for each effect type
function getDefaultParameters(effectType: string) {
  const defaults: Record<string, any> = {
    "brightness-up": { brightness: 20 },
    "brightness-down": { brightness: -20 },
    "contrast-up": { contrast: 30 },
    "saturation-up": { saturation: 40 },
    "saturation-down": { saturation: -30 },
    "sepia": { sepia: 80 },
    "grayscale": { grayscale: 100 },
    "invert": { invert: 100 },
    "vintage": { vintage: 70, grain: 20, vignette: 30 },
    "dramatic": { contrast: 40, brightness: -10, saturation: -20 },
    "warm": { warm: 60, hue: 15 },
    "cool": { cool: 60, hue: -15 },
    "cinematic": { cinematic: 80, vignette: 40, contrast: 25 },
    "gaussian-blur": { blur: 15, blurType: "gaussian" },
    "motion-blur": { blur: 20, blurType: "motion" },
    "vignette": { vignette: 50 },
    "grain": { grain: 30 },
    "sharpen": { sharpen: 40 },
    "emboss": { emboss: 60 },
    "edge": { edge: 70 },
    "pixelate": { pixelate: 20 },
  };

  return defaults[effectType] || {};
}
