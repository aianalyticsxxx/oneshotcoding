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
              <span>cd ~/feed/following</span>
            </div>
            <h1 className="text-xl font-semibold text-terminal-text font-mono">
              <span className="text-terminal-accent">&#62;</span> Following
            </h1>
            <p className="text-sm text-terminal-text-secondary font-mono">
              // shots from devs you follow
            </p>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FeedNavigation />
          </motion.div>

          {/* Feed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <VibeFeed feedType="following" />
          </motion.div>
        </div>
      </DashboardLayout>

      <VibePulse />
    </CaptureGate>
  );
}
