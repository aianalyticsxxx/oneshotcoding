'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { useActivity, ActivityMode } from '@/hooks/useActivity';
import { useAuth } from '@/hooks/useAuth';
import type { ActivityItem as ApiActivityItem } from '@/lib/api';

interface ActivityFeedProps {
  mode?: ActivityMode;
}

function getActivityText(item: ApiActivityItem, currentUsername?: string): string {
  switch (item.type) {
    case 'shot':
      return 'shipped a build';
    case 'sparkle':
      // Check if target is the current user
      if (item.targetUsername === currentUsername) {
        return 'sparked your post';
      }
      return item.targetUsername ? `sparked @${item.targetUsername}` : 'sparked a post';
    case 'follow':
      // Check if target is the current user
      if (item.targetUsername === currentUsername) {
        return 'followed you';
      }
      return item.targetUsername ? `followed @${item.targetUsername}` : 'followed someone';
    default:
      return '';
  }
}

function getActivityIcon(type: ApiActivityItem['type']): string {
  switch (type) {
    case 'shot':
      return '\u2192';
    case 'sparkle':
      return '\u2728';
    case 'follow':
      return '+';
    default:
      return '\u2022';
  }
}

export function ActivityFeed({ mode = 'personal' }: ActivityFeedProps) {
  const { user } = useAuth();
  const { items, isLoading, error } = useActivity(mode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
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
            activity ~ ./recent
          </span>
        </div>
      </div>

      {/* Activity Items */}
      <div className="p-3 space-y-0.5 max-h-64 overflow-y-auto scrollbar-terminal">
        {isLoading ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-text-dim animate-pulse">
              loading activity...
            </span>
          </div>
        ) : error ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-error">
              {error.includes('401') ? 'sign in to see activity' : 'error loading activity'}
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-4 text-center">
            <span className="font-mono text-xs text-terminal-text-dim">
              no recent activity
            </span>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 py-1.5 px-2 rounded-md text-sm font-mono"
            >
              <span className="text-terminal-accent flex-shrink-0 w-4">
                {getActivityIcon(item.type)}
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${item.actorUsername}`}
                  className="text-terminal-text hover:text-terminal-accent transition-colors"
                >
                  @{item.actorUsername}
                </Link>
                <span className="text-terminal-text-secondary ml-1">
                  {getActivityText(item, user?.username)}
                </span>
              </div>
              <span className="text-terminal-text-dim text-xs flex-shrink-0">
                {formatRelativeTime(new Date(item.timestamp))}
              </span>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
