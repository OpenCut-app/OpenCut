"use client";

import { useEffect, useState, useMemo } from "react";
import { useEffectsStore } from "@/stores/effects-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { useProjectStore } from "@/stores/project-store";
import {
  Loader2,
  Grid3X3,
  Sparkles,
  Palette,
  Camera,
  Film,
  Zap,
  Search,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EffectCategory } from "@/types/effects";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

const CATEGORY_ICONS: Record<EffectCategory, React.ReactNode> = {
  basic: <Zap className="h-3 w-3" />,
  color: <Palette className="h-3 w-3" />,
  artistic: <Sparkles className="h-3 w-3" />,
  vintage: <Camera className="h-3 w-3" />,
  cinematic: <Film className="h-3 w-3" />,
  distortion: <Zap className="h-3 w-3" />,
};

export function EffectsView() {
  const { selectedCategory, setSelectedCategory } = useEffectsStore();

  return (
    <div className="h-full flex flex-col">
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => {
          if (
            [
              "all",
              "basic",
              "color",
              "artistic",
              "vintage",
              "cinematic",
              "distortion",
            ].includes(v)
          ) {
            setSelectedCategory(v as EffectCategory | "all");
          }
        }}
        className="flex flex-col h-full"
      >
        <div className="px-3 pt-4 pb-0">
          <TabsList>
            <TabsTrigger value="all" className="gap-1">
              <Grid3X3 className="h-3 w-3" />
              All
            </TabsTrigger>
            <TabsTrigger value="basic" className="gap-1">
              {CATEGORY_ICONS.basic}
              Basic
            </TabsTrigger>
            <TabsTrigger value="color" className="gap-1">
              {CATEGORY_ICONS.color}
              Color
            </TabsTrigger>
            <TabsTrigger value="artistic" className="gap-1">
              {CATEGORY_ICONS.artistic}
              Artistic
            </TabsTrigger>
            <TabsTrigger value="vintage" className="gap-1">
              {CATEGORY_ICONS.vintage}
              Vintage
            </TabsTrigger>
            <TabsTrigger value="cinematic" className="gap-1">
              {CATEGORY_ICONS.cinematic}
              Cinematic
            </TabsTrigger>
            <TabsTrigger value="distortion" className="gap-1">
              {CATEGORY_ICONS.distortion}
              Distortion
            </TabsTrigger>
          </TabsList>
        </div>
        <Separator className="my-4" />
        <TabsContent
          value="all"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="all" />
        </TabsContent>
        <TabsContent
          value="basic"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="basic" />
        </TabsContent>
        <TabsContent
          value="color"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="color" />
        </TabsContent>
        <TabsContent
          value="artistic"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="artistic" />
        </TabsContent>
        <TabsContent
          value="vintage"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="vintage" />
        </TabsContent>
        <TabsContent
          value="cinematic"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="cinematic" />
        </TabsContent>
        <TabsContent
          value="distortion"
          className="px-3 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <EffectsContentView category="distortion" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EffectGrid({
  effects,
  onAdd,
  addingEffect,
}: {
  effects: any[];
  onAdd: (effect: any) => void;
  addingEffect: string | null;
}) {
  return (
    <div className="grid gap-2 grid-cols-2">
      {effects.map((effect) => (
        <EffectItem
          key={effect.id}
          effect={effect}
          onAdd={onAdd}
          isAdding={addingEffect === effect.id}
        />
      ))}
    </div>
  );
}

function EmptyView({ message }: { message: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function EffectsContentView({
  category,
}: {
  category: EffectCategory | "all";
}) {
  const { activeProject } = useProjectStore();
  const { currentTime } = usePlaybackStore();
  const { tracks } = useTimelineStore();
  const {
    searchQuery,
    isAddingEffect,
    getFilteredPresets,
    addEffectToTimeline,
    setSearchQuery,
  } = useEffectsStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [addingEffect, setAddingEffect] = useState<string | null>(null);

  const filteredEffects = useMemo(() => {
    const effects = getFilteredPresets();
    if (category === "all") {
      return effects;
    }
    return effects.filter((effect) => effect.category === category);
  }, [getFilteredPresets, category]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        setSearchQuery(localSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearchQuery, searchQuery, setSearchQuery]);

  const handleAddEffect = async (effect: any) => {
    if (!activeProject) {
      toast.error("No active project");
      return;
    }

    setAddingEffect(effect.id);

    try {
      const success = await addEffectToTimeline(effect);
      if (success) {
        toast.success(`Applied "${effect.name}" effect`);
      }
    } catch (error) {
      console.error("Failed to add effect:", error);
      toast.error("Failed to add effect to timeline");
    } finally {
      setAddingEffect(null);
    }
  };

  // Check if there are any video elements in the timeline
  const hasVideoElements = useMemo(() => {
    const mediaTracks = tracks.filter((track) => track.type === "media");
    const totalMediaElements = mediaTracks.reduce((total, track) => total + track.elements.length, 0);
    console.log("Media tracks:", mediaTracks.length, "Total media elements:", totalMediaElements);
    return totalMediaElements > 0;
  }, [tracks]);

  const effectsToDisplay = useMemo(() => {
    if (localSearchQuery.trim()) {
      return filteredEffects;
    }
    return filteredEffects;
  }, [filteredEffects, localSearchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search effects..."
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Effects Grid */}
      <ScrollArea className="flex-1">
        {effectsToDisplay.length === 0 ? (
          <EmptyView
            message={
              localSearchQuery.trim()
                ? "No effects found matching your search"
                : "No effects available in this category"
            }
          />
        ) : (
          <>
            {!hasVideoElements && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="text-orange-600 mt-0.5">⚠️</div>
                  <div className="text-xs">
                    <p className="font-medium text-orange-800 mb-1">No media elements found</p>
                    <p className="text-orange-700 mb-2">Add a video to your timeline to apply effects</p>
                    <div className="text-xs space-y-1 text-left bg-orange-100 p-2 rounded">
                      <p className="font-medium">How to add effects:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Drag a video to the timeline</li>
                        <li>Click on an effect to apply it</li>
                        <li>Adjust parameters in the properties panel</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <EffectGrid
              effects={effectsToDisplay}
              onAdd={handleAddEffect}
              addingEffect={addingEffect}
            />
          </>
        )}
      </ScrollArea>
    </div>
  );
}

interface EffectItemProps {
  effect: any;
  onAdd: (effect: any) => void;
  isAdding?: boolean;
}

function EffectItem({ effect, onAdd, isAdding }: EffectItemProps) {
  const { tracks } = useTimelineStore();
  
  const hasVideoElements = useMemo(() => {
    const mediaTracks = tracks.filter((track) => track.type === "media");
    return mediaTracks.reduce((total, track) => total + track.elements.length, 0) > 0;
  }, [tracks]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative",
            isAdding && "opacity-50 pointer-events-none"
          )}
        >
          <DraggableMediaItem
            name={effect.name}
            preview={
              <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/50 rounded-md">
                <div className="text-2xl mb-2">{effect.icon}</div>
                <span className="text-xs text-center font-medium">
                  {effect.name}
                </span>
              </div>
            }
            dragData={{
              id: "effect-placeholder",
              type: "effect",
              name: effect.name,
            }}
            onAddToTimeline={() => onAdd(effect)}
            aspectRatio={1}
            showLabel={false}
            rounded={true}
            variant="card"
            className=""
            containerClassName="w-full"
            isDraggable={false}
          />
          {isAdding && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-md z-10">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">{effect.name}</p>
          <p className="text-xs text-muted-foreground">{effect.description}</p>
          {!hasVideoElements && (
            <p className="text-xs text-orange-500 mt-1">
              ⚠️ Add a video to timeline first
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
