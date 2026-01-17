'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useFollow } from '@/hooks/useFollow';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
// CaptureGate intentionally disabled - profiles viewable without posting
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { ReportButton } from '@/components/moderation/ReportButton';
import type { User } from '@/lib/auth';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user: currentUser, logout, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch user data
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data, error } = await api.getUser(username);
      if (error) throw new Error(error.message);
      return data as User;
    },
  });

  // Fetch user shots
  const { data: shotsData, isLoading: shotsLoading } = useQuery({
    queryKey: ['profile-shots', username],
    queryFn: async () => {
      const { data, error } = await api.getUserShots(username);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
  });

  const shots = shotsData?.items ?? [];
  const isLoading = userLoading || shotsLoading;
  const error = userError;

  const isOwnProfile = currentUser?.username === username;

  // Follow state - uses user.id when available
  const { isFollowing, followerCount, followingCount, isToggling, toggleFollow } = useFollow(user?.id ?? '');

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

  if (error || !user) {
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

  return (
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

            {/* Stats */}
            <div className="flex justify-center gap-6 py-4 border-y border-glass-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{shots.length}</p>
                <p className="text-white/50 text-sm">Shots</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{followerCount}</p>
                <p className="text-white/50 text-sm">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{followingCount}</p>
                <p className="text-white/50 text-sm">Following</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {shots.reduce((sum, s) => sum + s.sparkleCount, 0)}
                </p>
                <p className="text-white/50 text-sm">Sparkles</p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-center gap-3">
              {isOwnProfile ? (
                <>
                  <Button variant="gradient" size="sm" onClick={() => setIsEditModalOpen(true)}>
                    Edit Profile
                  </Button>
                  <Button variant="glass" size="sm" onClick={logout}>
                    Sign Out
                  </Button>
                </>
              ) : !authLoading && currentUser && (
                <>
                  <Button
                    variant={isFollowing ? 'glass' : 'gradient'}
                    size="sm"
                    onClick={toggleFollow}
                    disabled={isToggling}
                    className={isFollowing ? 'hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50' : ''}
                  >
                    {isToggling ? (
                      <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isFollowing ? (
                      'Following'
                    ) : (
                      'Follow'
                    )}
                  </Button>
                  <ReportButton
                    targetType="user"
                    targetId={user.id}
                    targetName={`@${user.username}`}
                    variant="text"
                  />
                </>
              )}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Shots grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {shots.length === 0 ? (
            <GlassPanel className="text-center" padding="lg">
              <div className="text-4xl mb-4">✨</div>
              <p className="text-white/60">
                {isOwnProfile
                  ? "You haven't shared any shots yet"
                  : "No shots yet"}
              </p>
            </GlassPanel>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {shots.map((shot, index) => (
                <motion.div
                  key={shot.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="aspect-square relative rounded overflow-hidden group cursor-pointer"
                  onClick={() => router.push(`/shot/${shot.id}`)}
                >
                  <Image
                    src={shot.imageUrl}
                    alt={shot.caption || shot.prompt || 'Shot'}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 33vw, 170px"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <div className="flex items-center gap-2 text-white">
                      <span className="text-lg">✨</span>
                      <span className="font-semibold">{shot.sparkleCount}</span>
                    </div>
                    {shot.prompt && (
                      <p className="text-white/80 text-xs px-2 text-center line-clamp-2">{shot.prompt}</p>
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
          Creating since{' '}
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
              queryClient.setQueryData(['profile', username], updatedUser);
            }}
          />
        )}
    </div>
  );
}
