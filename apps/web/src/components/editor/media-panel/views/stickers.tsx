"use client";

import { useEffect, useState, useMemo } from "react";
import { useStickersStore } from "@/stores/stickers-store";
import { useMediaStore } from "@/stores/media-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import {
  Loader2,
  Grid3X3,
  Hash,
  Smile,
  Clock,
  X,
  Sparkles,
  ArrowRight,
  StickerIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelBaseView as BaseView } from "@/components/editor/panel-base-view";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  getIconSvgUrl,
  buildIconSvgUrl,
  ICONIFY_HOSTS,
  POPULAR_COLLECTIONS,
} from "@/lib/iconify-api";
import { cn } from "@/lib/utils";
import { TIMELINE_CONSTANTS } from "@/constants/timeline-constants";
import Image from "next/image";
import type { MediaFile } from "@/types/media";
import { DraggableMediaItem } from "@/components/ui/draggable-item";
import { InputWithBack } from "@/components/ui/input-with-back";
import { StickerCategory } from "@/stores/stickers-store";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

export function StickersView() {
  const { selectedCategory, setSelectedCategory } = useStickersStore();

  return (
    <BaseView
      value={selectedCategory}
      onValueChange={(v) => {
        if (["all", "general", "brands", "emoji"].includes(v)) {
          setSelectedCategory(v as StickerCategory);
        }
      }}
      tabs={[
        {
          value: "all",
          label: "All",
          icon: <Grid3X3 className="h-3 w-3" />,
          content: <StickersContentView category="all" />,
        },
        {
          value: "general",
          label: "Icons",
          icon: <Sparkles className="h-3 w-3" />,
          content: <StickersContentView category="general" />,
        },
        {
          value: "brands",
          label: "Brands",
          icon: <Hash className="h-3 w-3" />,
          content: <StickersContentView category="brands" />,
        },
        {
          value: "emoji",
          label: "Emoji",
          icon: <Smile className="h-3 w-3" />,
          content: <StickersContentView category="emoji" />,
        },
      ]}
      className="flex flex-col h-full p-0 overflow-hidden"
    />
  );
}

function StickerGrid({
  icons,
  onAdd,
  addingSticker,
  capSize = false,
}: {
  icons: string[];
  onAdd: (iconName: string) => void;
  addingSticker: string | null;
  capSize?: boolean;
}) {
  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: capSize
          ? "repeat(auto-fill, minmax(var(--sticker-min, 96px), var(--sticker-max, 160px)))"
          : "repeat(auto-fit, minmax(var(--sticker-min, 96px), 1fr))",
        ["--sticker-min" as any]: "96px",
        ...(capSize ? ({ ["--sticker-max"]: "160px" } as any) : {}),
      }}
    >
      {icons.map((iconName) => (
        <StickerItem
          key={iconName}
          iconName={iconName}
          onAdd={onAdd}
          isAdding={addingSticker === iconName}
          capSize={capSize}
        />
      ))}
    </div>
  );
}

function CollectionGrid({
  collections,
  onSelectCollection,
}: {
  collections: Array<{
    prefix: string;
    name: string;
    total: number;
    category?: string;
  }>;
  onSelectCollection: (prefix: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {collections.map((collection) => (
        <CollectionItem
          key={collection.prefix}
          title={collection.name}
          subtitle={`${collection.total.toLocaleString()} icons${collection.category ? ` • ${collection.category}` : ""}`}
          onClick={() => onSelectCollection(collection.prefix)}
        />
      ))}
    </div>
  );
}

function EmptyView({ message }: { message: string }) {
  return (
    <div className="bg-panel h-full p-4 flex flex-col items-center justify-center gap-3">
      <StickerIcon
        className="w-10 h-10 text-muted-foreground"
        strokeWidth={1.5}
      />
      <div className="flex flex-col gap-2 text-center">
        <p className="text-lg font-medium">No stickers found</p>
        <p className="text-sm text-muted-foreground text-balance">{message}</p>
      </div>
    </div>
  );
}

function StickersContentView({ category }: { category: StickerCategory }) {
  const { activeProject } = useProjectStore();
  const { addElementAtTime } = useTimelineStore();
  const { currentTime } = usePlaybackStore();
  const { addMediaFile } = useMediaStore();
  const {
    searchQuery,
    selectedCollection,
    viewMode,
    collections,
    currentCollection,
    searchResults,
    recentStickers,
    isLoadingCollections,
    isLoadingCollection,
    isSearching,
    setSearchQuery,
    setSelectedCollection,
    loadCollections,
    searchStickers,
    addStickerToTimeline,
    clearRecentStickers,
    setSelectedCategory,
    addingSticker,
  } = useStickersStore();

  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [collectionsToShow, setCollectionsToShow] = useState(20);
  const [showCollectionItems, setShowCollectionItems] = useState(false);

  const filteredCollections = useMemo(() => {
    if (category === "all") {
      return Object.entries(collections).map(([prefix, collection]) => ({
        prefix,
        name: collection.name,
        total: collection.total,
        category: collection.category,
      }));
    }

    const collectionList =
      POPULAR_COLLECTIONS[category as keyof typeof POPULAR_COLLECTIONS];
    if (!collectionList) return [];

    return collectionList
      .map((c) => {
        const collection = collections[c.prefix];
        return collection
          ? {
              prefix: c.prefix,
              name: c.name,
              total: collection.total,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      prefix: string;
      name: string;
      total: number;
    }>;
  }, [collections, category]);

  const { scrollAreaRef, handleScroll } = useInfiniteScroll({
    onLoadMore: () => setCollectionsToShow((prev) => prev + 20),
    hasMore: filteredCollections.length > collectionsToShow,
    isLoading: isLoadingCollections,
    enabled: viewMode === "browse" && !selectedCollection && category === "all",
  });

  useEffect(() => {
    if (Object.keys(collections).length === 0) {
      loadCollections();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== searchQuery) {
        setSearchQuery(localSearchQuery);
        if (localSearchQuery.trim()) {
          searchStickers(localSearchQuery);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchQuery]);

  const handleAddSticker = async (iconName: string) => {
    try {
      await addStickerToTimeline(iconName);
    } catch (error) {
      console.error("Failed to add sticker:", error);
      toast.error("Failed to add sticker to timeline");
    }
  };

  const iconsToDisplay = useMemo(() => {
    if (viewMode === "search" && searchResults) {
      return searchResults.icons;
    }

    if (viewMode === "collection" && currentCollection) {
      const icons: string[] = [];

      if (currentCollection.uncategorized) {
        icons.push(
          ...currentCollection.uncategorized.map(
            (name) => `${currentCollection.prefix}:${name}`
          )
        );
      }

      if (currentCollection.categories) {
        Object.values(currentCollection.categories).forEach((categoryIcons) => {
          icons.push(
            ...categoryIcons.map(
              (name) => `${currentCollection.prefix}:${name}`
            )
          );
        });
      }

      return icons.slice(0, 100);
    }

    return [];
  }, [viewMode, searchResults, currentCollection]);

  const isInCollection = viewMode === "collection" && !!selectedCollection;

  useEffect(() => {
    if (isInCollection) {
      setShowCollectionItems(false);
      const timer = setTimeout(() => setShowCollectionItems(true), 350);
      return () => clearTimeout(timer);
    } else {
      setShowCollectionItems(false);
    }
  }, [isInCollection]);

  return (
    <div className="flex flex-col gap-5 mt-1 h-full p-4">
      <div className="space-y-3">
        <InputWithBack
          isExpanded={isInCollection}
          setIsExpanded={(expanded) => {
            if (!expanded && isInCollection) {
              setSelectedCollection(null);
            }
          }}
          placeholder={
            category === "all"
              ? "Search all stickers"
              : category === "general"
                ? "Search icons"
                : category === "brands"
                  ? "Search brands"
                  : "Search Emojis"
          }
          value={localSearchQuery}
          onChange={setLocalSearchQuery}
          disableAnimation={true}
        />
      </div>

      <div className="relative h-full overflow-hidden">
        <ScrollArea
          className="flex-1 h-full"
          ref={scrollAreaRef}
          onScrollCapture={handleScroll}
        >
          <div className="flex flex-col gap-4 h-full">
            {recentStickers.length > 0 && viewMode === "browse" && (
              <div className="h-full">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Recent</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={clearRecentStickers}
                          className="ml-auto h-5 w-5 p-0 rounded hover:bg-accent flex items-center justify-center"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear recent stickers</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <StickerGrid
                  icons={recentStickers.slice(0, 12)}
                  onAdd={handleAddSticker}
                  addingSticker={addingSticker}
                  capSize
                />
              </div>
            )}

            {viewMode === "collection" && selectedCollection && (
              <div className="h-full">
                {isLoadingCollection ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : showCollectionItems ? (
                  <StickerGrid
                    icons={iconsToDisplay}
                    onAdd={handleAddSticker}
                    addingSticker={addingSticker}
                  />
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            )}

            {viewMode === "search" && (
              <div className="h-full">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults?.icons.length ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">
                        {searchResults.total} results
                      </span>
                    </div>
                    <StickerGrid
                      icons={iconsToDisplay}
                      onAdd={handleAddSticker}
                      addingSticker={addingSticker}
                      capSize
                    />
                  </>
                ) : searchQuery ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <EmptyView
                      message={`No stickers found for "${searchQuery}"`}
                    />
                    {category !== "all" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          const q = localSearchQuery || searchQuery;
                          if (q) {
                            setSearchQuery(q);
                          }
                          setSelectedCategory("all");
                          if (q) {
                            searchStickers(q);
                          }
                        }}
                      >
                        Search in all icons
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {viewMode === "browse" && !selectedCollection && (
              <div className="space-y-4 h-full">
                {isLoadingCollections ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {category !== "all" && (
                      <div className="h-full">
                        <h3 className="text-sm font-medium mb-2">
                          Popular{" "}
                          {category === "general"
                            ? "Icon Sets"
                            : category === "brands"
                              ? "Brand Icons"
                              : "Emoji Sets"}
                        </h3>
                        <CollectionGrid
                          collections={filteredCollections}
                          onSelectCollection={setSelectedCollection}
                        />
                      </div>
                    )}

                    {category === "all" && filteredCollections.length > 0 && (
                      <div className="h-full">
                        <CollectionGrid
                          collections={filteredCollections.slice(
                            0,
                            collectionsToShow
                          )}
                          onSelectCollection={setSelectedCollection}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface CollectionItemProps {
  title: string;
  subtitle: string;
  onClick: () => void;
}

function CollectionItem({ title, subtitle, onClick }: CollectionItemProps) {
  return (
    <Button
      variant="outline"
      className="justify-between h-auto py-2 "
      onClick={onClick}
    >
      <div className="text-left">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

interface StickerItemProps {
  iconName: string;
  onAdd: (iconName: string) => void;
  isAdding?: boolean;
  capSize?: boolean;
}

function StickerItem({
  iconName,
  onAdd,
  isAdding,
  capSize = false,
}: StickerItemProps) {
  const [imageError, setImageError] = useState(false);
  const [hostIndex, setHostIndex] = useState(0);

  useEffect(() => {
    setImageError(false);
    setHostIndex(0);
  }, [iconName]);

  const displayName = iconName.split(":")[1] || iconName;
  const collectionPrefix = iconName.split(":")[0];

  const preview = imageError ? (
    <div className="w-full h-full flex items-center justify-center p-2">
      <span className="text-xs text-muted-foreground text-center break-all">
        {displayName}
      </span>
    </div>
  ) : (
    <div className="w-full h-full p-4 flex items-center justify-center">
      <Image
        src={
          hostIndex === 0
            ? getIconSvgUrl(iconName, { width: 64, height: 64 })
            : buildIconSvgUrl(
                ICONIFY_HOSTS[Math.min(hostIndex, ICONIFY_HOSTS.length - 1)],
                iconName,
                { width: 64, height: 64 }
              )
        }
        alt={displayName}
        width={64}
        height={64}
        className="w-full h-full object-contain"
        style={
          capSize
            ? {
                maxWidth: "var(--sticker-max, 160px)",
                maxHeight: "var(--sticker-max, 160px)",
              }
            : undefined
        }
        onError={() => {
          const next = hostIndex + 1;
          if (next < ICONIFY_HOSTS.length) {
            setHostIndex(next);
          } else {
            setImageError(true);
          }
        }}
        loading="lazy"
        unoptimized
      />
    </div>
  );

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
            name={displayName}
            preview={preview}
            dragData={{
              id: "sticker-placeholder",
              type: "image",
              name: displayName,
            }}
            onAddToTimeline={() => onAdd(iconName)}
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
          <p className="font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{collectionPrefix}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
