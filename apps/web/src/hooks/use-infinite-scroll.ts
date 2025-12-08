import { useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Provides refs and a scroll handler to trigger loading more items when the user scrolls near the bottom of a container.
 *
 * @param onLoadMore - Callback invoked to load the next page or batch of items
 * @param hasMore - Whether additional items are available to load
 * @param isLoading - Whether a load operation is currently in progress; prevents duplicate loads
 * @param threshold - Distance in pixels from the bottom of the container at which `onLoadMore` is triggered (default: 200)
 * @param enabled - When false, disables the scroll handler so no loading is triggered (default: true)
 * @returns An object containing `scrollAreaRef` (ref for the scrollable container) and `handleScroll` (the scroll event handler)
 */
export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  threshold = 200,
  enabled = true,
}: UseInfiniteScrollOptions) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!enabled) return;

      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const nearBottom = scrollTop + clientHeight >= scrollHeight - threshold;

      if (nearBottom && hasMore && !isLoading) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading, threshold, enabled]
  );

  return { scrollAreaRef, handleScroll };
}