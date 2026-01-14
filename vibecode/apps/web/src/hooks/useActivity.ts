'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api, ActivityItem, ActivityFeedResponse } from '@/lib/api';
import { useCallback } from 'react';

export type ActivityMode = 'personal' | 'global';

export interface UseActivityReturn {
  items: ActivityItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function useActivity(mode: ActivityMode = 'personal'): UseActivityReturn {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['activity', mode],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getActivity(mode, pageParam);

      if (error) {
        throw new Error(error.message);
      }

      return data as ActivityFeedResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore && lastPage?.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 1, // 1 minute - activity is more real-time
  });

  const items = data?.pages.flatMap((page) => page?.items || []) || [];

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    items,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
  };
}
