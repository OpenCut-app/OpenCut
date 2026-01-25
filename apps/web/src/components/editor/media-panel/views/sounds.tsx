"use client";

import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PlayIcon,
  PauseIcon,
  HeartIcon,
  PlusIcon,
  ListFilter,
} from "lucide-react";
import { useSoundsStore } from "@/stores/sounds-store";
import { useSoundSearch } from "@/hooks/use-sound-search";
import type { SoundEffect, SavedSound } from "@/types/sounds";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";

const mergeUniqueSoundEffectsById = (
  existingSoundEffects: SoundEffect[],
  incomingSoundEffects: SoundEffect[],
) => {
  const seenSoundIds = new Set<number>();
  const mergedSoundEffects: SoundEffect[] = [];

  for (const soundEffect of existingSoundEffects) {
    if (seenSoundIds.has(soundEffect.id)) continue;
    seenSoundIds.add(soundEffect.id);
    mergedSoundEffects.push(soundEffect);
  }

  for (const soundEffect of incomingSoundEffects) {
    if (seenSoundIds.has(soundEffect.id)) continue;
    seenSoundIds.add(soundEffect.id);
    mergedSoundEffects.push(soundEffect);
  }

  return mergedSoundEffects;
};

export function SoundsView() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="sound-effects" className="flex flex-col h-full">
        <div className="px-3 pt-4 pb-0">
          <TabsList>
            <TabsTrigger value="sound-effects">Sound effects</TabsTrigger>
            <TabsTrigger value="songs">Songs</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </div>
        <div className="my-4">
          <Separator />
        </div>
        <TabsContent
          value="sound-effects"
          className="p-5 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <SoundEffectsView />
        </TabsContent>
        <TabsContent
          value="saved"
          className="p-5 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <SavedSoundsView />
        </TabsContent>
        <TabsContent
          value="songs"
          className="p-5 pt-0 mt-0 flex-1 flex flex-col min-h-0"
        >
          <SongsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SoundEffectsView() {
  const {
    topSoundEffects,
    isLoading,
    searchQuery,
    setSearchQuery,
    scrollPosition,
    setScrollPosition,
    loadSavedSounds,
    isSoundSaved,
    toggleSavedSound,
    showCommercialOnly,
    toggleCommercialFilter,
    hasLoaded,
    setTopSoundEffects,
    setLoading,
    setError,
    setHasLoaded,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
  } = useSoundsStore();
  const {
    results: searchResults,
    isLoading: isSearching,
    loadMore,
    hasNextPage,
    isLoadingMore,
  } = useSoundSearch(searchQuery, showCommercialOnly);

  // Audio playback state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  const { scrollAreaRef, handleScroll } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: hasNextPage,
    isLoading: isLoadingMore || isSearching,
  });

  useEffect(() => {
    loadSavedSounds();

    if (!hasLoaded) {
      let ignore = false;

      const fetchTopSounds = async () => {
        try {
          if (!ignore) {
            setLoading(true);
            setError(null);
          }

          const response = await fetch(
            "/api/sounds/search?page_size=50&sort=downloads",
          );

          if (!ignore) {
            if (!response.ok) {
              throw new Error(`Failed to fetch: ${response.status}`);
            }

            const data = await response.json();
            setTopSoundEffects(data.results);
            setHasLoaded(true);

            setCurrentPage(1);
            setHasNextPage(!!data.next);
            setTotalCount(data.count);
          }
        } catch (error) {
          if (!ignore) {
            console.error("Failed to fetch top sounds:", error);
            setError(
              error instanceof Error ? error.message : "Failed to load sounds",
            );
          }
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      };

      const timeoutId = setTimeout(fetchTopSounds, 100);

      return () => {
        clearTimeout(timeoutId);
        ignore = true;
      };
    }

    if (scrollAreaRef.current && scrollPosition > 0) {
      const timeoutId = setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollPosition });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [
    hasLoaded,
    setTopSoundEffects,
    setLoading,
    setError,
    setHasLoaded,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
  ]);

  const handleScrollWithPosition = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = event.currentTarget;
    setScrollPosition(scrollTop);
    handleScroll(event);
  };

  const displayedSounds = useMemo(() => {
    const sounds = searchQuery ? searchResults : topSoundEffects;
    return sounds;
  }, [searchQuery, searchResults, topSoundEffects]);

  const playSound = (sound: SoundEffect) => {
    if (playingId === sound.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    // Stop previous sound
    audioElement?.pause();

    if (sound.previewUrl) {
      const audio = new Audio(sound.previewUrl);
      audio.addEventListener("ended", () => {
        setPlayingId(null);
      });
      audio.addEventListener("error", (e) => {
        setPlayingId(null);
      });
      audio.play().catch((error) => {
        setPlayingId(null);
      });

      setAudioElement(audio);
      setPlayingId(sound.id);
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-1 h-full min-h-0">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search sound effects"
          className="bg-panel-accent w-full"
          containerClassName="w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          showClearIcon
          onClear={() => setSearchQuery("")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(showCommercialOnly && "text-primary")}
            >
              <ListFilter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={showCommercialOnly}
              onCheckedChange={toggleCommercialFilter}
            >
              Show only commercially licensed
            </DropdownMenuCheckboxItem>
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {showCommercialOnly
                ? "Only showing sounds licensed for commercial use"
                : "Showing all sounds regardless of license"}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <ScrollArea
          className="h-full"
          ref={scrollAreaRef}
          onScrollCapture={handleScrollWithPosition}
        >
          <div className="flex flex-col gap-4">
            {isLoading && !searchQuery && (
              <div className="text-muted-foreground text-sm">
                Loading sounds...
              </div>
            )}
            {isSearching && searchQuery && (
              <div className="text-muted-foreground text-sm">Searching...</div>
            )}
            {displayedSounds.map((sound) => (
              <AudioItem
                key={sound.id}
                sound={sound}
                isPlaying={playingId === sound.id}
                onPlay={() => playSound(sound)}
                isSaved={isSoundSaved(sound.id)}
                onToggleSaved={() => toggleSavedSound(sound)}
              />
            ))}
            {!isLoading && !isSearching && displayedSounds.length === 0 && (
              <div className="text-muted-foreground text-sm">
                {searchQuery ? "No sounds found" : "No sounds available"}
              </div>
            )}
            {isLoadingMore && (
              <div className="text-muted-foreground text-sm text-center py-4">
                Loading more sounds...
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SavedSoundsView() {
  const {
    savedSounds,
    isLoadingSavedSounds,
    savedSoundsError,
    loadSavedSounds,
    isSoundSaved,
    toggleSavedSound,
    clearSavedSounds,
  } = useSoundsStore();

  // Audio playback state
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  // Clear confirmation dialog state
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Load saved sounds when tab becomes active
  useEffect(() => {
    loadSavedSounds();
  }, [loadSavedSounds]);

  const playSound = (sound: SavedSound) => {
    if (playingId === sound.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    // Stop previous sound
    audioElement?.pause();

    if (sound.previewUrl) {
      const audio = new Audio(sound.previewUrl);
      audio.addEventListener("ended", () => {
        setPlayingId(null);
      });
      audio.addEventListener("error", (e) => {
        setPlayingId(null);
      });
      audio.play().catch((error) => {
        setPlayingId(null);
      });

      setAudioElement(audio);
      setPlayingId(sound.id);
    }
  };

  // Convert SavedSound to SoundEffect for compatibility with AudioItem
  const convertToSoundEffect = (savedSound: SavedSound): SoundEffect => ({
    id: savedSound.id,
    name: savedSound.name,
    description: "",
    url: "",
    previewUrl: savedSound.previewUrl,
    downloadUrl: savedSound.downloadUrl,
    duration: savedSound.duration,
    filesize: 0,
    type: "audio",
    channels: 0,
    bitrate: 0,
    bitdepth: 0,
    samplerate: 0,
    username: savedSound.username,
    tags: savedSound.tags,
    license: savedSound.license,
    created: savedSound.savedAt,
    downloads: 0,
    rating: 0,
    ratingCount: 0,
  });

  if (isLoadingSavedSounds) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">
          Loading saved sounds...
        </div>
      </div>
    );
  }

  if (savedSoundsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-destructive text-sm">
          Error: {savedSoundsError}
        </div>
      </div>
    );
  }

  if (savedSounds.length === 0) {
    return (
      <div className="bg-panel h-full p-4 flex flex-col items-center justify-center gap-3">
        <HeartIcon
          className="w-10 h-10 text-muted-foreground"
          strokeWidth={1.5}
        />
        <div className="flex flex-col gap-2 text-center">
          <p className="text-lg font-medium">No saved sounds</p>
          <p className="text-sm text-muted-foreground text-balance">
            Click the heart icon on any sound to save it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 mt-1 h-full min-h-0">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {savedSounds.length} saved{" "}
          {savedSounds.length === 1 ? "sound" : "sounds"}
        </p>
        <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto text-muted-foreground hover:text-destructive !opacity-100"
            >
              Clear all
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear all saved sounds?</DialogTitle>
              <DialogDescription>
                This will permanently remove all {savedSounds.length} saved
                sounds from your collection. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await clearSavedSounds();
                  setShowClearDialog(false);
                }}
              >
                Clear all sounds
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 h-full">
          <div className="flex flex-col gap-4">
            {savedSounds.map((sound) => (
              <AudioItem
                key={sound.id}
                sound={convertToSoundEffect(sound)}
                isPlaying={playingId === sound.id}
                onPlay={() => playSound(sound)}
                isSaved={isSoundSaved(sound.id)}
                onToggleSaved={() =>
                  toggleSavedSound(convertToSoundEffect(sound))
                }
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function SongsView() {
  const {
    showCommercialOnly,
    toggleCommercialFilter,
    isSoundSaved,
    toggleSavedSound,
  } = useSoundsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<SoundEffect[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setLoadingMore] = useState(false);

  const [playingId, setPlayingId] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null,
  );

  const fetchSongsPage = useCallback(
    async ({ query, page }: { query: string; page: number }) => {
      const searchParams = new URLSearchParams({
        type: "songs",
        page: page.toString(),
        sort: query.trim() ? "score" : "downloads",
        page_size: query.trim() ? "20" : "50",
        commercial_only: showCommercialOnly.toString(),
      });

      if (query.trim()) {
        searchParams.set("q", query);
      }

      const response = await fetch(
        `/api/sounds/search?${searchParams.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`Songs fetch failed: ${response.status}`);
      }

      const data = (await response.json()) as {
        results: SoundEffect[];
        next: string | null;
      };

      return {
        results: data.results,
        hasNextPage: !!data.next,
      };
    },
    [showCommercialOnly],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      const { results, hasNextPage: nextHasNextPage } = await fetchSongsPage({
        query: searchQuery,
        page: nextPage,
      });

      setSongs((previousSongs) =>
        mergeUniqueSoundEffectsById(previousSongs, results),
      );
      setCurrentPage(nextPage);
      setHasNextPage(nextHasNextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Load more failed");
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, fetchSongsPage, hasNextPage, isLoadingMore, searchQuery]);

  const { scrollAreaRef, handleScroll } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: hasNextPage,
    isLoading: isLoadingMore || isLoading,
  });

  const handleScrollCapture = (event: React.UIEvent<HTMLDivElement>) => {
    handleScroll(event);
  };

  useEffect(() => {
    let ignore = false;

    const timeoutId = setTimeout(
      async () => {
        try {
          setError(null);
          setLoading(true);
          setCurrentPage(1);

          const { results, hasNextPage: nextHasNextPage } =
            await fetchSongsPage({
              query: searchQuery,
              page: 1,
            });

          if (ignore) return;
          setSongs(mergeUniqueSoundEffectsById([], results));
          setHasNextPage(nextHasNextPage);
        } catch (caught) {
          if (ignore) return;
          setError(
            caught instanceof Error ? caught.message : "Songs fetch failed",
          );
          setSongs([]);
          setHasNextPage(false);
        } finally {
          if (!ignore) {
            setLoading(false);
          }
        }
      },
      searchQuery.trim() ? 300 : 0,
    );

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [fetchSongsPage, searchQuery]);

  const playSong = (sound: SoundEffect) => {
    if (playingId === sound.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    audioElement?.pause();

    if (sound.previewUrl) {
      const audio = new Audio(sound.previewUrl);
      audio.addEventListener("ended", () => {
        setPlayingId(null);
      });
      audio.addEventListener("error", () => {
        setPlayingId(null);
      });
      audio.play().catch(() => {
        setPlayingId(null);
      });

      setAudioElement(audio);
      setPlayingId(sound.id);
    }
  };

  return (
    <div className="flex flex-col gap-5 mt-1 h-full min-h-0">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search music"
          className="bg-panel-accent w-full"
          containerClassName="w-full"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          showClearIcon
          onClear={() => setSearchQuery("")}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(showCommercialOnly && "text-primary")}
            >
              <ListFilter className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuCheckboxItem
              checked={showCommercialOnly}
              onCheckedChange={toggleCommercialFilter}
            >
              Show only commercially licensed
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <ScrollArea
          className="h-full"
          ref={scrollAreaRef}
          onScrollCapture={handleScrollCapture}
        >
          <div className="flex flex-col gap-4">
            {error && <div className="text-destructive text-sm">{error}</div>}
            {isLoading && (
              <div className="text-muted-foreground text-sm">
                {searchQuery.trim() ? "Searching..." : "Loading music..."}
              </div>
            )}
            {!isLoading && songs.length === 0 && !error && (
              <div className="text-muted-foreground text-sm">
                {searchQuery.trim() ? "No songs found" : "No music available"}
              </div>
            )}

            {songs.map((song) => (
              <AudioItem
                key={song.id}
                sound={song}
                isPlaying={playingId === song.id}
                onPlay={() => playSong(song)}
                isSaved={isSoundSaved(song.id)}
                onToggleSaved={() => toggleSavedSound(song)}
              />
            ))}

            {isLoadingMore && (
              <div className="text-muted-foreground text-sm text-center py-4">
                Loading more songs...
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

interface AudioItemProps {
  sound: SoundEffect;
  isPlaying: boolean;
  onPlay: () => void;
  isSaved: boolean;
  onToggleSaved: () => void;
}

function AudioItem({
  sound,
  isPlaying,
  onPlay,
  isSaved,
  onToggleSaved,
}: AudioItemProps) {
  const { addSoundToTimeline } = useSoundsStore();

  const handleClick = () => {
    onPlay();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSaved();
  };

  const handleAddToTimeline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addSoundToTimeline(sound);
  };

  return (
    <div
      className="group flex items-center gap-3 opacity-100 hover:opacity-75 transition-opacity cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative w-12 h-12 bg-accent rounded-md flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        {isPlaying ? (
          <PauseIcon className="w-5 h-5" />
        ) : (
          <PlayIcon className="w-5 h-5" />
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <p className="font-medium truncate text-sm">{sound.name}</p>
        <span className="text-xs text-muted-foreground truncate block">
          {sound.username}
        </span>
      </div>

      <div className="flex items-center gap-3 pr-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground !opacity-100 w-auto"
          onClick={handleAddToTimeline}
          title="Add to timeline"
        >
          <PlusIcon className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`hover:text-foreground !opacity-100 w-auto ${
            isSaved
              ? "text-red-500 hover:text-red-600"
              : "text-muted-foreground"
          }`}
          onClick={handleSaveClick}
          title={isSaved ? "Remove from saved" : "Save sound"}
        >
          <HeartIcon className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
