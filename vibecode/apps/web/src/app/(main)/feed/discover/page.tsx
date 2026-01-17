'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { VibePulse } from '@/components/presence/VibePulse';
import { DashboardLayout, StatsPanel, TrendingPanel, ActivityFeed } from '@/components/dashboard';
import { VibeCard } from '@/components/feed/VibeCard';
import { useAuth } from '@/hooks/useAuth';
import { useDiscoveryFeed } from '@/hooks/useDiscoveryFeed';

type SortOption = 'recent' | 'popular';

export default function DiscoverFeedPage() {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortOption>('recent');
  const { vibes, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useDiscoveryFeed(sort);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '100px',
    });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  const sidebar = (
    <>
      <StatsPanel username={user?.username} />
      <TrendingPanel />
      <ActivityFeed mode="global" />
    </>
  );

  return (
    <CaptureGate>
      <DashboardLayout sidebar={sidebar}>
        <div className="space-y-5">
          {/* Terminal Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-2 font-mono text-terminal-text-dim text-xs">
              <span className="text-terminal-accent">$</span>
              <span>cd ~/feed/discover</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-terminal-text font-mono">
                  <span className="text-terminal-accent">&#62;</span> Discover
                </h1>
                <p className="text-sm text-terminal-text-secondary font-mono">
                  // explore shots from all coders
                </p>
              </div>

              {/* Sort toggle */}
              <div className="flex rounded-lg p-1 bg-terminal-bg-elevated border border-terminal-border">
                <button
                  onClick={() => setSort('recent')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    sort === 'recent'
                      ? 'bg-terminal-accent/20 text-terminal-accent'
                      : 'text-terminal-text-dim hover:text-terminal-text'
                  }`}
                >
                  recent
                </button>
                <button
                  onClick={() => setSort('popular')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                    sort === 'popular'
                      ? 'bg-terminal-accent/20 text-terminal-accent'
                      : 'text-terminal-text-dim hover:text-terminal-text'
                  }`}
                >
                  popular
                </button>
              </div>
            </div>
          </motion.div>

          {/* Feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-terminal-bg-elevated border border-terminal-border rounded-lg"
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-terminal-border" />
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-terminal-border rounded mb-2" />
                        <div className="h-3 w-24 bg-terminal-border rounded" />
                      </div>
                    </div>
                    <div className="aspect-square bg-terminal-border" />
                  </div>
                ))}
              </div>
            ) : vibes.length === 0 ? (
              <div className="text-center py-12 bg-terminal-bg-elevated border border-terminal-border rounded-lg">
                <div className="text-4xl mb-4">{'{ }'}</div>
                <h2 className="text-lg font-mono text-terminal-text mb-2">
                  No shots found
                </h2>
                <p className="text-sm text-terminal-text-dim font-mono">
                  // be the first to share your creation
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {vibes.map((vibe, index) => (
                  <motion.div
                    key={vibe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <VibeCard vibe={vibe} />
                  </motion.div>
                ))}

                {/* Load more trigger */}
                <div ref={loadMoreRef} className="h-10">
                  {isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {!hasNextPage && vibes.length > 0 && (
                  <p className="text-center text-xs text-terminal-text-dim font-mono py-4">
                    // end of feed
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </DashboardLayout>

      <VibePulse />
    </CaptureGate>
  );
}
