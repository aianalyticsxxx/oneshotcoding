'use client';

import Link from 'next/link';
import { useTrendingTags } from '@/hooks/useTags';

interface TrendingSidebarProps {
  className?: string;
}

/**
 * Sidebar component showing trending hashtags
 * Terminal-styled with counts for each tag
 */
export function TrendingSidebar({ className }: TrendingSidebarProps) {
  const { tags, isLoading, error } = useTrendingTags(7, 10);

  if (error) {
    return null; // Silently fail - sidebar is supplementary
  }

  return (
    <div className={className}>
      <div className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden shadow-terminal sticky top-20">
        {/* Header */}
        <div className="bg-terminal-bg-elevated px-4 py-3 border-b border-terminal-border">
          <div className="flex items-center gap-2 font-mono text-sm">
            <span className="text-terminal-accent">#</span>
            <span className="text-terminal-text">trending</span>
            <span className="text-terminal-text-dim">--week</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-24 bg-terminal-bg-elevated rounded animate-pulse" />
                  <div className="h-4 w-8 bg-terminal-bg-elevated rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : tags.length === 0 ? (
            <p className="text-terminal-text-dim text-sm font-mono">
              No trending tags yet
            </p>
          ) : (
            <ul className="space-y-2">
              {tags.map((tag, index) => (
                <li key={tag.name}>
                  <Link
                    href={`/tags/${tag.name}`}
                    className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded
                               hover:bg-terminal-bg-elevated transition-colors group"
                  >
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-terminal-text-dim w-4 text-right">
                        {index + 1}.
                      </span>
                      <span className="text-terminal-accent group-hover:text-terminal-accent/80 transition-colors">
                        #{tag.name}
                      </span>
                    </div>
                    <span className="text-terminal-text-dim text-xs font-mono">
                      {tag.count} {tag.count === 1 ? 'shot' : 'shots'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        {tags.length > 0 && (
          <div className="px-4 py-2 border-t border-terminal-border bg-terminal-bg-elevated">
            <p className="text-terminal-text-dim text-xs font-mono">
              Use #hashtags in prompts to join trends
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
