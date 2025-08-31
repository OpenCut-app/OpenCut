"use client";

import { useEffect } from "react";
import { useSoundsStore } from "@/stores/sounds-store";

export function useGlobalPrefetcher() {
  const {
    hasLoaded,
    setTopSoundEffects,
    setLoading,
    setError,
    setHasLoaded,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
  } = useSoundsStore();

  useEffect(() => {
    if (hasLoaded) return;

    let ignore = false;

    const prefetchTopSounds = async () => {
      try {
        if (!ignore) {
          setLoading(true);
          setError(null);
        }

        const response = await fetch(
          "/api/sounds/search?page_size=50&sort=downloads"
        );

        if (!ignore) {
          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
          }

          const data = await response.json();
          setTopSoundEffects(data.results);
          setHasLoaded(true);

          // Set pagination state for top sounds
          setCurrentPage(1);
          setHasNextPage(!!data.next);
          setTotalCount(data.count);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to prefetch top sounds:", error);
          setError(
            error instanceof Error ? error.message : "Failed to load sounds"
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(prefetchTopSounds, 100);

    return () => {
      clearTimeout(timeoutId);
      ignore = true;
    };
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
}
