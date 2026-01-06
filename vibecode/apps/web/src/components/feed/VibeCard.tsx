'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Avatar } from '@/components/ui/Avatar';
import { VibeButton } from './VibeButton';
import { LateBadge } from './LateBadge';
import { PhotoReactionsRow } from '@/components/reactions/PhotoReactionsRow';
import { useTheme } from '@/hooks/useTheme';
import type { Vibe } from '@/lib/api';

export interface VibeCardProps {
  vibe: Vibe;
  className?: string;
}

export function VibeCard({ vibe, className }: VibeCardProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <GlassPanel className={cn('overflow-hidden', className)} padding="none">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Link href={`/profile/${vibe.user.username}`}>
          <Avatar
            src={vibe.user.avatarUrl}
            alt={vibe.user.displayName}
            size="md"
            glow={!isNeumorphic}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${vibe.user.username}`}
            className={cn(
              "font-semibold hover:text-vibe-purple-light transition-colors block truncate",
              isNeumorphic ? "text-neumorphic-text" : "text-white"
            )}
          >
            {vibe.user.displayName}
          </Link>
          <div className={cn("text-sm flex items-center gap-2 flex-wrap", isNeumorphic ? "text-neumorphic-text-secondary" : "text-white/50")}>
            <span>@{vibe.user.username} · {formatRelativeTime(vibe.createdAt)}</span>
            {vibe.isLate && vibe.lateByMinutes > 0 && (
              <LateBadge lateByMinutes={vibe.lateByMinutes} />
            )}
          </div>
        </div>
      </div>

      {/* Image - clickable to expand */}
      <motion.div
        className="relative aspect-video cursor-pointer group"
        whileHover={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        onClick={() => setIsExpanded(true)}
      >
        <Image
          src={vibe.imageUrl}
          alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
          fill
          className="object-contain bg-black"
          sizes="(max-width: 768px) 100vw, 512px"
        />
        {/* Hover hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            Tap to expand
          </span>
        </div>
      </motion.div>

      {/* Expanded image modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="text-sm">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Full image */}
              <div className="rounded-2xl overflow-hidden">
                <img
                  src={vibe.imageUrl}
                  alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
                  className="w-full h-auto max-h-[80vh] object-contain bg-black"
                />
              </div>

              {/* User info in modal */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
                <Avatar
                  src={vibe.user.avatarUrl}
                  alt={vibe.user.displayName}
                  size="sm"
                />
                <span className="text-white text-sm font-medium">{vibe.user.displayName}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-4">
        {/* Caption */}
        {vibe.caption && (
          <p className={cn("mb-3", isNeumorphic ? "text-neumorphic-text" : "text-white/90")}>
            <Link
              href={`/profile/${vibe.user.username}`}
              className="font-semibold hover:text-vibe-purple-light transition-colors mr-2"
            >
              {vibe.user.username}
            </Link>
            {vibe.caption}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <VibeButton
            vibeId={vibe.id}
            sparkleCount={vibe.sparkleCount}
            hasSparkled={vibe.hasSparkled}
          />

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className={cn(
              "p-2 transition-colors",
              isNeumorphic
                ? "text-neumorphic-text-secondary hover:text-neumorphic-text"
                : "text-white/50 hover:text-white"
            )}
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Check out this vibe!',
                  url: `${window.location.origin}/vibe/${vibe.id}`,
                });
              }
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </motion.button>
        </div>

        {/* Photo Reactions */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <PhotoReactionsRow vibeId={vibe.id} />
        </div>
      </div>
    </GlassPanel>
  );
}
