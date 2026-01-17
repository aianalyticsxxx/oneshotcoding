'use client';

import { useState, useEffect, useRef } from 'react';
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

// Share dropdown component
function ShareDropdown({ url, title }: { url: string; title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const shareOptions = [
    {
      name: 'X',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      getUrl: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: 'Telegram',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      getUrl: () => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      getUrl: () => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      name: 'Copy Link',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: async () => {
        await navigator.clipboard.writeText(url);
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        className="py-1.5 px-2 rounded-md
                   text-terminal-text-secondary hover:text-terminal-text
                   transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-2 w-40
                       bg-terminal-bg-card border border-terminal-border rounded-lg
                       shadow-lg overflow-hidden z-50"
          >
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={() => {
                  if (option.action) {
                    option.action();
                  } else if (option.getUrl) {
                    window.open(option.getUrl(), '_blank', 'noopener,noreferrer');
                    setIsOpen(false);
                  }
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                           text-terminal-text-secondary hover:text-terminal-text
                           hover:bg-terminal-bg-hover transition-colors
                           font-mono text-sm"
              >
                {option.icon}
                <span>{option.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
              className="flex items-center gap-1.5 py-1.5 px-2 rounded-md
                         text-terminal-text-secondary hover:text-terminal-text
                         transition-all font-mono text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              {(vibe.commentCount ?? 0) > 0 && (
                <span>{vibe.commentCount}</span>
              )}
            </motion.button>

            {/* Follow button */}
            <FollowButton userId={vibe.user.id} size="sm" />
          </div>

          {/* Share dropdown */}
          <ShareDropdown
            url={`${typeof window !== 'undefined' ? window.location.origin : ''}/shot/${vibe.id}`}
            title={`Check out @${vibe.user.username}'s build on OneShotCoding!`}
          />

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
