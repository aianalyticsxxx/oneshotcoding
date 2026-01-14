'use client';

import { motion } from 'framer-motion';
import { VibeFeed } from '@/components/feed/VibeFeed';
import { FeedNavigation } from '@/components/feed/FeedNavigation';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { VibePulse } from '@/components/presence/VibePulse';
import { DashboardLayout, StatsPanel, TrendingPanel, ActivityFeed } from '@/components/dashboard';
import { useAuth } from '@/hooks/useAuth';

export default function FollowingFeedPage() {
  const { user } = useAuth();

  const sidebar = (
    <>
      <StatsPanel username={user?.username} />
      <TrendingPanel />
      <ActivityFeed mode="personal" />
    </>
  );

  return (
    <CaptureGate>
      <DashboardLayout sidebar={sidebar}>
        <div className="space-y-5">
          {/* Terminal Window Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden"
          >
            {/* Window chrome */}
            <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-terminal-error/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-terminal-success/60" />
                </div>
                <span className="font-mono text-xs text-terminal-text-secondary">
                  ~/feed/following
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-4 bg-terminal-accent animate-pulse" />
              </div>
            </div>

            {/* Terminal content */}
            <div className="p-4 space-y-2">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 font-mono text-sm"
              >
                <span className="text-terminal-accent">$</span>
                <span className="text-terminal-text">cat README.md</span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="pl-4 border-l-2 border-terminal-accent/30"
              >
                <h1 className="text-lg font-semibold text-terminal-text font-mono">
                  Following Feed
                </h1>
                <p className="text-sm text-terminal-text-secondary font-mono mt-1">
                  Latest shots from developers you follow.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 font-mono text-sm pt-2"
              >
                <span className="text-terminal-success">✓</span>
                <span className="text-terminal-text-secondary">
                  {user ? `logged in as @${user.username}` : 'viewing public feed'}
                </span>
              </motion.div>
            </div>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <FeedNavigation />
          </motion.div>

          {/* Feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <VibeFeed feedType="following" />
          </motion.div>
        </div>
      </DashboardLayout>

      <VibePulse />
    </CaptureGate>
  );
}
