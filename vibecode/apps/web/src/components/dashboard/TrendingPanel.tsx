'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useTrendingTags } from '@/hooks/useTags';

export function TrendingPanel() {
  const { tags, isLoading } = useTrendingTags(7, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-warning/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
          </div>
          <span className="font-mono text-xs text-terminal-text-secondary">
            trending ~ ./tags
          </span>
        </div>
      </div>

      {/* Trending Items */}
      <div className="p-3 space-y-1">
        {isLoading ? (
          // Loading skeleton
          [...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-2">
              <div className="h-4 w-20 bg-terminal-bg-elevated rounded animate-pulse" />
              <div className="h-4 w-8 bg-terminal-bg-elevated rounded animate-pulse" />
            </div>
          ))
        ) : tags.length === 0 ? (
          <p className="text-terminal-text-dim text-xs font-mono py-2 px-2">
            No trending tags yet
          </p>
        ) : (
          tags.map((item) => (
            <Link
              key={item.name}
              href={`/tags/${item.name}`}
              className="flex items-center justify-between py-1.5 px-2 rounded-md
                         hover:bg-terminal-bg-hover transition-colors group"
            >
              <span className="font-mono text-sm">
                <span className="text-terminal-accent">#</span>
                <span className="text-terminal-text group-hover:text-terminal-accent transition-colors">
                  {item.name}
                </span>
              </span>
              <span className="font-mono text-xs text-terminal-text-dim">
                {item.count}
              </span>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}
