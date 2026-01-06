'use client';

import { useState, useEffect } from 'react';
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
  // null = closed, 'prompt' = zoomed to prompt overlay, 'result' = full image view
  const [expandedView, setExpandedView] = useState<'prompt' | 'result' | null>(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!expandedView) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedView(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [expandedView]);

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

      {/* Image with separate clickable regions for prompt and result */}
      <div className="relative aspect-video bg-black">
        {/* Main image - clicking expands as "result" view */}
        <motion.div
          className="absolute inset-0 cursor-pointer group"
          whileHover={{ scale: 1.005 }}
          transition={{ duration: 0.2 }}
          onClick={() => setExpandedView('result')}
        >
          <Image
            src={vibe.imageUrl}
            alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 672px"
          />
          {/* Result label */}
          <div className="absolute bottom-2 right-2">
            <span className="bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium opacity-60 group-hover:opacity-100 transition-opacity">
              ✨ RESULT
            </span>
          </div>
        </motion.div>

        {/* Clickable prompt overlay zone (top-left corner) */}
        <motion.div
          className="absolute top-2 left-2 w-[30%] aspect-square cursor-pointer z-10 group/prompt"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={(e) => {
            e.stopPropagation();
            setExpandedView('prompt');
          }}
        >
          {/* Invisible hit area with visible hover effect */}
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover/prompt:border-vibe-purple group-hover/prompt:bg-vibe-purple/10 transition-all" />
          {/* Prompt label that appears on hover */}
          <div className="absolute -bottom-1 left-0 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
            <span className="bg-vibe-purple/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-medium">
              💬 PROMPT - tap to expand
            </span>
          </div>
        </motion.div>
      </div>

      {/* Expanded image modal */}
      <AnimatePresence>
        {expandedView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setExpandedView(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-6xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setExpandedView(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="text-sm">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Image with zoom based on view */}
              <div className={cn(
                "rounded-2xl overflow-hidden border-4",
                expandedView === 'prompt' ? "border-vibe-purple" : "border-green-500"
              )}>
                <div className={cn(
                  "relative bg-black",
                  expandedView === 'prompt' ? "w-full aspect-square" : ""
                )}>
                  <img
                    src={vibe.imageUrl}
                    alt={vibe.caption || `Vibe by ${vibe.user.displayName}`}
                    className={cn(
                      "bg-black",
                      expandedView === 'prompt'
                        // Zoom into top-left corner where prompt overlay lives (35% of image, with 24px margin)
                        ? "w-[300%] h-auto object-cover object-left-top"
                        : "w-full h-auto max-h-[80vh] object-contain"
                    )}
                  />
                </div>
              </div>

              {/* View label */}
              <div className="absolute bottom-4 left-4">
                <span className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium",
                  expandedView === 'prompt'
                    ? "bg-vibe-purple text-white"
                    : "bg-green-500 text-white"
                )}>
                  {expandedView === 'prompt' ? '💬 PROMPT' : '✨ RESULT'}
                </span>
              </div>

              {/* Toggle between views */}
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setExpandedView('prompt')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    expandedView === 'prompt'
                      ? "bg-vibe-purple text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  💬 Prompt
                </button>
                <button
                  onClick={() => setExpandedView('result')}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all",
                    expandedView === 'result'
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                  )}
                >
                  ✨ Result
                </button>
              </div>

              {/* User info in modal */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-full">
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
