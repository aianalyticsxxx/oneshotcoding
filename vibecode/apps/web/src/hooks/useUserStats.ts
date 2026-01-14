'use client';

import { useQuery } from '@tanstack/react-query';
import { api, UserStats } from '@/lib/api';

export interface UseUserStatsReturn {
  stats: UserStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserStats(username: string | undefined): UseUserStatsReturn {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-stats', username],
    queryFn: async () => {
      if (!username) return null;

      const { data, error } = await api.getUserStats(username);

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!username,
  });

  return {
    stats: data || null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
