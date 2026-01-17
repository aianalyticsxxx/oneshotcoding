'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useChallenges } from '@/hooks/useChallenges';
import { DashboardLayout, StatsPanel, TrendingPanel, ActivityFeed } from '@/components/dashboard';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { Challenge } from '@/lib/api';

type FilterTab = 'active' | 'upcoming' | 'completed';

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const getStatusBadge = () => {
    switch (challenge.status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-green-500/20 text-green-400 border border-green-500/30">
            [ACTIVE]
          </span>
        );
      case 'voting':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            [VOTING]
          </span>
        );
      case 'upcoming':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
            [UPCOMING]
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-terminal-text-dim/20 text-terminal-text-dim border border-terminal-border">
            [COMPLETED]
          </span>
        );
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <div className="bg-terminal-bg-elevated border border-terminal-border rounded-lg p-4 hover:border-terminal-accent/50 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {challenge.isOfficial && (
              <span className="text-terminal-accent font-mono text-sm" title="Official Challenge">
                [*]
              </span>
            )}
            {challenge.isSponsored && (
              <span className="text-purple-400 font-mono text-sm" title="Sponsored">
                [$]
              </span>
            )}
            <h3 className="font-mono font-semibold text-terminal-text group-hover:text-terminal-accent transition-colors">
              {challenge.title}
            </h3>
          </div>
          {getStatusBadge()}
        </div>

        {challenge.description && (
          <p className="text-sm font-mono text-terminal-text-secondary mb-3 line-clamp-2">
            // {challenge.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-sm font-mono text-terminal-text-dim">
          <span>
            {formatDate(challenge.startsAt)} → {formatDate(challenge.endsAt)}
          </span>
          {challenge.prizeDescription && (
            <span className="text-terminal-accent">
              prize: {challenge.prizeDescription}
            </span>
          )}
        </div>

        {challenge.sponsorName && (
          <p className="text-xs font-mono mt-2 text-terminal-text-dim">
            // sponsored by {challenge.sponsorName}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterTab>('active');
  const { challenges, isLoading } = useChallenges(filter);

  const sidebar = (
    <>
      <StatsPanel username={user?.username} />
      <TrendingPanel />
      <ActivityFeed mode="global" />
    </>
  );

  return (
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
            <span>cd ~/challenges</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-terminal-text font-mono">
                <span className="text-terminal-accent">&gt;</span> Challenges
              </h1>
              <p className="text-sm text-terminal-text-secondary font-mono">
                // compete with the community in weekly challenges
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg p-1 bg-terminal-bg-elevated border border-terminal-border">
              {(['active', 'upcoming', 'completed'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-mono rounded-md transition-colors",
                    filter === tab
                      ? "bg-terminal-accent/20 text-terminal-accent"
                      : "text-terminal-text-dim hover:text-terminal-text"
                  )}
                >
                  ./{tab}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Challenges List */}
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
                  className="animate-pulse bg-terminal-bg-elevated border border-terminal-border rounded-lg p-4"
                >
                  <div className="h-5 w-48 bg-terminal-border rounded mb-3" />
                  <div className="h-4 w-full bg-terminal-border rounded mb-2" />
                  <div className="h-3 w-32 bg-terminal-border rounded" />
                </div>
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12 bg-terminal-bg-elevated border border-terminal-border rounded-lg">
              <div className="text-4xl mb-4 font-mono text-terminal-accent">{'{ }'}</div>
              <h2 className="text-lg font-mono text-terminal-text mb-2">
                No {filter} challenges
              </h2>
              <p className="text-sm text-terminal-text-dim font-mono">
                {filter === 'active'
                  ? '// check back soon for new challenges'
                  : filter === 'upcoming'
                  ? '// no upcoming challenges scheduled'
                  : '// no completed challenges yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge, index) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ChallengeCard challenge={challenge} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
