'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api, TrendingTag, Shot, TagShotsResponse } from '@/lib/api';
import { useCallback } from 'react';

export interface UseTrendingTagsReturn {
  tags: TrendingTag[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTrendingTags(days: number = 7, limit: number = 10): UseTrendingTagsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tags', 'trending', days, limit],
    queryFn: async () => {
      const { data, error } = await api.getTrendingTags(days, limit);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    tags: data?.tags || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}

export interface UseTagFeedReturn {
  shots: Shot[];
  tagName: string | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}

export function useTagFeed(tagName: string): UseTagFeedReturn {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    error,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['tags', tagName, 'shots'],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await api.getShotsByTag(tagName, pageParam);

      if (error) {
        throw new Error(error.message);
      }

      return data as TagShotsResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage?.hasMore && lastPage?.nextCursor) {
        return lastPage.nextCursor;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!tagName,
  });

  const shots = data?.pages.flatMap((page) => page?.shots || []) || [];
  const resolvedTagName = data?.pages[0]?.tag || null;

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    shots,
    tagName: resolvedTagName,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage || false,
    error: error instanceof Error ? error.message : null,
    loadMore,
    refetch,
  };
}
