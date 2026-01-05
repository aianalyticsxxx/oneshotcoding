'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { api, Vibe } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CaptureGate } from '@/components/capture/CaptureGate';
import { StreakDisplay } from '@/components/profile/StreakDisplay';
import { LateBadge } from '@/components/feed/LateBadge';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import type { User } from '@/lib/auth';

interface ProfileData {
  user: User;
  vibes: Vibe[];
}

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user: currentUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await api.getUser(username);

      if (error) {
        throw new Error(error.message);
      }

      return data as ProfileData;
    },
  });

  const { streak } = useStreak(username);
  const isOwnProfile = currentUser?.username === username;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Profile skeleton */}
        <GlassPanel className="animate-pulse">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white/10 mb-4" />
            <div className="h-6 w-32 bg-white/10 rounded mb-2" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        </GlassPanel>

        {/* Grid skeleton */}
        <div className="grid grid-cols-3 gap-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data || !data.user) {
    return (
      <GlassPanel className="text-center" padding="lg">
        <div className="text-5xl mb-4">😔</div>
        <h1 className="text-xl font-semibold text-white mb-2">User not found</h1>
        <p className="text-white/60">
          {error instanceof Error ? error.message : 'Could not load this profile'}
        </p>
      </GlassPanel>
    );
  }

  const { user, vibes } = data;

  return (
    <CaptureGate>
      <div className="space-y-6">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassPanel className="text-center">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar
                src={user.avatarUrl}
                alt={user.displayName}
                size="xl"
                glow
                glowColor="purple"
              />
            </div>

            {/* Name */}
            <h1 className="text-2xl font-bold text-white mb-1">
              {user.displayName}
            </h1>
            <p className="text-white/50 mb-4">@{user.username}</p>

            {/* Bio */}
            {user.bio && (
              <p className="text-white/70 mb-4 max-w-xs mx-auto">{user.bio}</p>
            )}

            {/* Streak Display */}
            {streak && (
              <div className="flex justify-center mb-4">
                <StreakDisplay
                  streak={streak}
                  size="lg"
                  showMilestone
                  showNextMilestone={isOwnProfile}
                />
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-center gap-8 py-4 border-y border-glass-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{vibes.length}</p>
                <p className="text-white/50 text-sm">Vibes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {vibes.reduce((sum, v) => sum + v.sparkleCount, 0)}
                </p>
                <p className="text-white/50 text-sm">Sparkles</p>
              </div>
              {streak && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{streak.longestStreak}</p>
                  <p className="text-white/50 text-sm">Best Streak</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {isOwnProfile && (
              <div className="mt-4 flex justify-center gap-3">
                <Button variant="gradient" size="sm" onClick={() => setIsEditModalOpen(true)}>
                  Edit Profile
                </Button>
                <Button variant="glass" size="sm" onClick={logout}>
                  Sign Out
                </Button>
              </div>
            )}
          </GlassPanel>
        </motion.div>

        {/* Vibes grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {vibes.length === 0 ? (
            <GlassPanel className="text-center" padding="lg">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-white/60">
                {isOwnProfile
                  ? "You haven't shared any vibes yet"
                  : "No vibes yet"}
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {vibes.map((vibe, index) => (
                <motion.div
                  key={vibe.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square relative rounded overflow-hidden group cursor-pointer"
                >
                  <Image
                    src={vibe.imageUrl}
                    alt={vibe.caption || 'Vibe'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 33vw, 170px"
                  />
                  {/* Late indicator */}
                  {vibe.isLate && vibe.lateByMinutes > 0 && (
                    <div className="absolute top-1 right-1">
                      <span className="text-orange-400 text-xs">⏰</span>
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">✨</span>
                      <span className="font-semibold">{vibe.sparkleCount}</span>
                    </div>
                    {vibe.isLate && vibe.lateByMinutes > 0 && (
                      <LateBadge lateByMinutes={vibe.lateByMinutes} className="text-xs" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Member since */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-white/30 text-sm"
        >
          Vibing since{' '}
          {new Date(user.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </motion.p>

        {/* Edit Profile Modal */}
        {isOwnProfile && (
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onUpdate={(updatedUser) => {
              // Update the cache with new user data
              queryClient.setQueryData(['profile', username], (old: ProfileData | undefined) => {
                if (!old) return old;
                return { ...old, user: updatedUser };
              });
            }}
          />
        )}
      </div>
    </CaptureGate>
  );
}
