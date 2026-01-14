'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { VibeButton } from './VibeButton';
import { FollowButton } from './FollowButton';
import { HashtagText } from '@/components/HashtagText';
import { ReportButton } from '@/components/moderation/ReportButton';
import type { Shot } from '@/lib/api';

// Keep Vibe as an alias for backwards compatibility
type Vibe = Shot;

export interface VibeCardProps {
  vibe: Vibe;
  className?: string;
}

// Format timestamp for terminal header
function formatTerminalTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();

  // Get dates at midnight for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const postDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  let dateStr: string;
  if (postDate.getTime() === today.getTime()) {
    dateStr = 'Today';
  } else if (postDate.getTime() === yesterday.getTime()) {
    dateStr = 'Yesterday';
  } else {
    dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return `${dateStr} ${timeStr} UTC`;
}

// Max lines to show before truncating prompt
const MAX_PROMPT_LINES = 3;
const MAX_PROMPT_CHARS = 280;

export function VibeCard({ vibe, className }: VibeCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isImageModalOpen]);

  // Generate a short ID for the terminal path
  const shortId = vibe.id.substring(0, 7);

  // Check if prompt needs truncation
  const promptNeedsTruncation = vibe.prompt && (
    vibe.prompt.length > MAX_PROMPT_CHARS ||
    vibe.prompt.split('\n').length > MAX_PROMPT_LINES
  );

  // Get truncated prompt text
  const getDisplayPrompt = () => {
    if (!vibe.prompt) return '';
    if (!promptNeedsTruncation || isExpanded) return vibe.prompt;

    const lines = vibe.prompt.split('\n').slice(0, MAX_PROMPT_LINES);
    let text = lines.join('\n');
    if (text.length > MAX_PROMPT_CHARS) {
      text = text.substring(0, MAX_PROMPT_CHARS);
    }
    return text;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden shadow-terminal',
        className
      )}
    >
      {/* Terminal Header */}
      <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="w-3 h-3 rounded-full bg-terminal-error/60" />
            <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
            <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
          </div>

          {/* Terminal path */}
          <div className="flex items-center gap-2 font-mono text-sm min-w-0">
            <Link
              href={`/profile/${vibe.user.username}`}
              className="text-terminal-text-secondary hover:text-terminal-accent transition-colors truncate"
            >
              @{vibe.user.username}
            </Link>
            <span className="text-terminal-text-dim">~</span>
            <span className="text-terminal-accent truncate">shot/{shortId}</span>
          </div>
        </div>

        {/* Timestamp */}
        <span className="font-mono text-xs text-terminal-text-dim flex-shrink-0 ml-2">
          {formatTerminalTime(vibe.createdAt)}
        </span>
      </div>

      {/* Media display - handles both images and videos */}
      {vibe.resultType === 'video' ? (
        // Video content
        <div className="relative bg-terminal-bg">
          <div className="relative aspect-video">
            <video
              src={vibe.imageUrl}
              controls
              className="w-full h-full object-contain bg-terminal-bg"
              preload="metadata"
            />
            {/* Video label */}
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="bg-terminal-success/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono">
                output
              </span>
            </div>
          </div>
        </div>
      ) : (
        // Image content - clean display, click to expand
        <div className="relative aspect-video bg-terminal-bg">
          <motion.div
            className="absolute inset-0 cursor-pointer group"
            whileHover={{ scale: 1.003 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsImageModalOpen(true)}
          >
            <Image
              src={vibe.imageUrl}
              alt={vibe.prompt || `Shot by ${vibe.user.displayName}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 672px"
            />
            {/* Output label */}
            <div className="absolute top-2 left-2 pointer-events-none">
              <span className="bg-terminal-success/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                output
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Prompt section - terminal style */}
      {vibe.prompt && (
        <div className="px-4 py-3 bg-terminal-bg-elevated border-t border-terminal-border">
          <div className="flex items-start gap-2 font-mono text-sm">
            <span className="text-terminal-accent flex-shrink-0">&gt;</span>
            <div className="flex-1 min-w-0">
              <p className="text-terminal-text whitespace-pre-wrap break-words">
                <HashtagText text={getDisplayPrompt()} />
                {promptNeedsTruncation && !isExpanded && '...'}
              </p>
              {promptNeedsTruncation && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-terminal-accent hover:text-terminal-accent/80 text-xs transition-colors"
                >
                  {isExpanded ? '[ show less ]' : '[ show more ]'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Expanded image modal */}
      <AnimatePresence>
        {isImageModalOpen && vibe.resultType !== 'video' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-terminal-bg/98 flex items-center justify-center p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute -top-12 right-0 text-terminal-text-secondary hover:text-terminal-text transition-colors flex items-center gap-2 font-mono text-sm"
              >
                <span>esc to close</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Full image display */}
              <div className="rounded-lg overflow-hidden border-2 border-terminal-success bg-terminal-bg">
                <img
                  src={vibe.imageUrl}
                  alt={vibe.prompt || `Shot by ${vibe.user.displayName}`}
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '80vh',
                    objectFit: 'contain',
                  }}
                />
              </div>

              {/* User info in modal */}
              <div className="flex items-center gap-2 mt-4 bg-terminal-bg-elevated border border-terminal-border px-3 py-2 rounded-md">
                <Avatar
                  src={vibe.user.avatarUrl}
                  alt={vibe.user.displayName}
                  size="sm"
                />
                <span className="text-terminal-text text-sm font-mono">@{vibe.user.username}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer - Terminal style status and actions */}
      <div className="p-4 border-t border-terminal-border">
        {/* Status line */}
        <div className="flex items-center gap-4 mb-3 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="text-terminal-success">✓</span>
            <span className="text-terminal-text-secondary">shipped</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-terminal-text-dim">&gt;</span>
            <span className="text-terminal-text-secondary">
              {formatRelativeTime(vibe.createdAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VibeButton
              vibeId={vibe.id}
              sparkleCount={vibe.sparkleCount}
              hasSparkled={vibe.hasSparkled}
            />

            {/* Comment button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push(`/shot/${vibe.id}/comments`)}
              className="flex items-center gap-1.5 py-1.5 px-3 rounded-md
                         bg-terminal-bg-elevated border border-terminal-border
                         text-terminal-text-secondary hover:text-terminal-text
                         hover:border-terminal-border-bright transition-all font-mono text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {(vibe.commentCount ?? 0) > 0 && (
                <span>{vibe.commentCount}</span>
              )}
            </motion.button>

            {/* Follow button */}
            <FollowButton userId={vibe.user.id} size="sm" />
          </div>

          {/* Share button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="py-1.5 px-3 rounded-md
                       bg-terminal-bg-elevated border border-terminal-border
                       text-terminal-text-secondary hover:text-terminal-text
                       hover:border-terminal-border-bright transition-all"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'Check out this shot!',
                  url: `${window.location.origin}/shot/${vibe.id}`,
                });
              }
            }}
          >
            <svg
              className="w-4 h-4"
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

          {/* Report button */}
          <ReportButton
            targetType="shot"
            targetId={vibe.id}
            targetName={`@${vibe.user.username}'s shot`}
          />
        </div>

      </div>
    </motion.div>
  );
}
