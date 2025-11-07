import { useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  enabled?: boolean;
}

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
