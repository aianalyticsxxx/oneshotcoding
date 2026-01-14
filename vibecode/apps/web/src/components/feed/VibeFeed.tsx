'use client';

import { useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useVibes } from '@/hooks/useVibes';
import { useFollowingFeed } from '@/hooks/useFollowingFeed';
import { VibeCard } from './VibeCard';

export interface VibeFeedProps {
  className?: string;
  feedType?: 'everyone' | 'following';
}

export function VibeFeed({ className, feedType = 'everyone' }: VibeFeedProps) {

  const everyoneFeed = useVibes();
  const followingFeed = useFollowingFeed();

  const activeFeed = feedType === 'following' ? followingFeed : everyoneFeed;

  const {
    vibes,
    isLoading,
    isLoadingMore,
    isRefetching,
    hasMore,
    error,
    loadMore,
    refetch,
  } = activeFeed;

  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  if (isLoading && vibes.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-terminal-bg-card border border-terminal-border rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-terminal-bg-hover" />
              <div className="flex-1">
                <div className="h-4 w-24 rounded mb-1 bg-terminal-bg-hover" />
                <div className="h-3 w-16 rounded bg-terminal-bg-hover" />
              </div>
            </div>
            <div className="aspect-video rounded-lg bg-terminal-bg-hover" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-terminal-bg-card border border-terminal-border rounded-lg text-center py-12', className)}>
        <div className="text-4xl mb-4">💥</div>
        <h3 className="text-lg font-mono text-terminal-text mb-2">
          // error: something went wrong
        </h3>
        <p className="text-terminal-text-secondary text-sm font-mono mb-4">{error}</p>
        <button
          onClick={() => refetch()}
          className="font-mono text-sm text-terminal-accent hover:underline"
        >
          [ retry ]
        </button>
      </div>
    );
  }

  if (vibes.length === 0) {
    return (
      <div className={cn('bg-terminal-bg-card border border-terminal-border rounded-lg text-center py-12', className)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-lg font-mono text-terminal-text mb-2">
            {feedType === 'following' ? '// no builds from friends yet' : '// no builds yet'}
          </h3>
          <p className="text-terminal-text-secondary text-sm font-mono">
            {feedType === 'following'
              ? '$ follow some devs to see their builds here'
              : '$ be the first to ship a build!'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Refresh button */}
      <div className="flex justify-center">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-mono transition-all
                     bg-terminal-bg-elevated border border-terminal-border
                     text-terminal-text-secondary hover:text-terminal-text hover:border-terminal-border-bright"
        >
          <motion.svg
            animate={isRefetching ? { rotate: 360 } : {}}
            transition={isRefetching ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </motion.svg>
          {isRefetching ? '[ syncing... ]' : '[ refresh ]'}
        </motion.button>
      </div>

      <AnimatePresence mode="popLayout">
        {vibes.map((vibe, index) => (
          <motion.div
            key={vibe.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <VibeCard vibe={vibe} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isLoadingMore && (
          <div className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
        )}
        {!hasMore && vibes.length > 0 && (
          <p className="text-sm font-mono text-terminal-text-dim">
            // end of feed
          </p>
        )}
      </div>
    </div>
  );
}
