'use client';

import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTagFeed } from '@/hooks/useTags';
import { VibeCard } from '@/components/feed/VibeCard';

export default function TagPage() {
  const params = useParams();
  const tagName = typeof params.tag === 'string' ? params.tag : '';
  const { shots, tagName: resolvedTag, isLoading, isLoadingMore, hasMore, error, loadMore } = useTagFeed(tagName);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-terminal-bg-card border border-terminal-border rounded-lg p-6 text-center">
          <div className="text-terminal-error font-mono mb-2">error</div>
          <p className="text-terminal-text-secondary">
            {error === 'Tag not found' ? `Tag #${tagName} doesn't exist yet` : error}
          </p>
          <Link
            href="/feed"
            className="inline-block mt-4 text-terminal-accent hover:text-terminal-accent/80 font-mono text-sm"
          >
            &larr; back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden">
          {/* Terminal header */}
          <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-terminal-error/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
            </div>
            <span className="font-mono text-sm text-terminal-text-secondary">
              tags/{resolvedTag || tagName}
            </span>
          </div>

          {/* Content */}
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl text-terminal-accent font-mono">#</span>
              <div>
                <h1 className="text-xl font-semibold text-terminal-text">
                  {resolvedTag || tagName}
                </h1>
                <p className="text-sm text-terminal-text-secondary font-mono">
                  {shots.length} {shots.length === 1 ? 'shot' : 'shots'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back link */}
        <Link
          href="/feed"
          className="inline-flex items-center gap-1 mt-3 text-terminal-text-secondary hover:text-terminal-accent font-mono text-sm transition-colors"
        >
          <span>&larr;</span>
          <span>back to feed</span>
        </Link>
      </motion.div>

      {/* Shots feed */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-terminal-bg-card border border-terminal-border rounded-lg h-96 animate-pulse"
            />
          ))}
        </div>
      ) : shots.length === 0 ? (
        <div className="bg-terminal-bg-card border border-terminal-border rounded-lg p-8 text-center">
          <p className="text-terminal-text-secondary font-mono">
            No shots with #{resolvedTag || tagName} yet
          </p>
          <p className="text-terminal-text-dim text-sm mt-2">
            Be the first to use this hashtag!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shots.map((shot) => (
            <VibeCard key={shot.id} vibe={shot} />
          ))}

          {/* Load more button */}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="font-mono text-sm py-2 px-4 rounded-md border
                           bg-terminal-bg-elevated border-terminal-border
                           text-terminal-text-secondary hover:text-terminal-accent
                           hover:border-terminal-accent transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingMore ? 'loading...' : 'load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
