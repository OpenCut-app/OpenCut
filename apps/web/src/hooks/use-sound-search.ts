import { useEffect } from "react";
import { useSoundsStore } from "@/stores/sounds-store";

/**
 * Searches sound effects and exposes search results, pagination, and loading state from the global store.
 *
 * Performs a debounced (300ms) search with race-condition protection and persists state in a shared store.
 *
 * @param query - The search query string to filter sound effects; an empty or whitespace-only string clears results.
 * @param commercialOnly - If true, restricts results to commercial-only sounds.
 * @returns An object containing:
 *  - `results`: the current array of search results,
 *  - `isLoading`: whether an initial search is in progress,
 *  - `error`: the current search error message or `null`,
 *  - `loadMore`: a function to fetch the next page of results,
 *  - `hasNextPage`: whether more pages are available,
 *  - `isLoadingMore`: whether a "load more" operation is in progress,
 *  - `totalCount`: the total number of matching results.
 */

export function useSoundSearch(query: string, commercialOnly: boolean) {
  const {
    searchResults,
    isSearching,
    searchError,
    lastSearchQuery,
    currentPage,
    hasNextPage,
    isLoadingMore,
    totalCount,
    setSearchResults,
    setSearching,
    setSearchError,
    setLastSearchQuery,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
    setLoadingMore,
    appendSearchResults,
    appendTopSounds,
    resetPagination,
  } = useSoundsStore();

  // Load more function for infinite scroll
  const loadMore = async () => {
    if (isLoadingMore || !hasNextPage) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;

      const searchParams = new URLSearchParams({
        page: nextPage.toString(),
        type: "effects",
      });

      if (query.trim()) {
        searchParams.set("q", query);
      }

      searchParams.set("commercial_only", commercialOnly.toString());
      const response = await fetch(
        `/api/sounds/search?${searchParams.toString()}`
      );

      if (response.ok) {
        const data = await response.json();

        // Append to appropriate array based on whether we have a query
        if (query.trim()) {
          appendSearchResults(data.results);
        } else {
          appendTopSounds(data.results);
        }

        setCurrentPage(nextPage);
        setHasNextPage(!!data.next);
        setTotalCount(data.count);
      } else {
        setSearchError(`Load more failed: ${response.status}`);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Load more failed");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      setLastSearchQuery("");
      // Don't reset pagination here - top sounds pagination is managed by prefetcher
      return;
    }

    // If we already searched for this query and have results, don't search again
    if (query === lastSearchQuery && searchResults.length > 0) {
      return;
    }

    let ignore = false;

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);
        resetPagination();

        const response = await fetch(
          `/api/sounds/search?q=${encodeURIComponent(query)}&type=effects&page=1`
        );

        if (!ignore) {
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results);
            setLastSearchQuery(query);
            setHasNextPage(!!data.next);
            setTotalCount(data.count);
            setCurrentPage(1);
          } else {
            setSearchError(`Search failed: ${response.status}`);
          }
        }
      } catch (err) {
        if (!ignore) {
          setSearchError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!ignore) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      ignore = true;
    };
  }, [
    query,
    lastSearchQuery,
    searchResults.length,
    setSearchResults,
    setSearching,
    setSearchError,
    setLastSearchQuery,
    setCurrentPage,
    setHasNextPage,
    setTotalCount,
    resetPagination,
  ]);

  return {
    results: searchResults,
    isLoading: isSearching,
    error: searchError,
    loadMore,
    hasNextPage,
    isLoadingMore,
    totalCount,
  };
}