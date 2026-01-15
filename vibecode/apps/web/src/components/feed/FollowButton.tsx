'use client';

import { cn } from '@/lib/utils';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';

interface FollowButtonProps {
  userId: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function FollowButton({ userId, className, size = 'sm' }: FollowButtonProps) {
  const { user } = useAuth();
  const { isFollowing, isLoading, isToggling, toggleFollow } = useFollow(userId);

  // Don't show follow button for own profile or if not logged in
  if (!user || user.id === userId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn(
        "animate-pulse rounded-full bg-white/10",
        size === 'sm' ? "w-16 h-6" : "w-20 h-8",
        className
      )} />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        toggleFollow();
      }}
      disabled={isToggling}
      className={cn(
        "rounded-full font-medium transition-all",
        size === 'sm' ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
        isFollowing
          ? "bg-white/10 text-white/80 hover:bg-red-500/20 hover:text-red-400"
          : "bg-vibe-purple text-white hover:bg-vibe-purple-light",
        isToggling && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isToggling ? (
        <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isFollowing ? (
        "Following"
      ) : (
        "Follow"
      )}
    </button>
  );
}
