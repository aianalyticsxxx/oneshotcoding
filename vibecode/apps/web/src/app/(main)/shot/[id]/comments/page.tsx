'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { cn, formatRelativeTime } from '@/lib/utils';
import { api } from '@/lib/api';
import { useComments } from '@/hooks/useComments';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';

export default function CommentsPage() {
  const params = useParams();
  const router = useRouter();
  const shotId = params.id as string;
  const { user } = useAuth();

  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Fetch the shot for header preview
  const { data: shot, isLoading: shotLoading } = useQuery({
    queryKey: ['shot', shotId],
    queryFn: async () => {
      const { data, error } = await api.getShot(shotId);
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!shotId,
  });

  const {
    comments,
    total,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    addComment,
    isAddingComment,
    deleteComment,
  } = useComments(shotId);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isAddingComment) return;

    try {
      await addComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Terminal Window Header */}
      <div className="flex-shrink-0 bg-terminal-bg-card border border-terminal-border rounded-t-lg overflow-hidden mb-4">
        {/* Terminal title bar */}
        <div className="bg-terminal-bg-elevated px-4 py-2.5 border-b border-terminal-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => router.back()}
                className="w-3 h-3 rounded-full bg-terminal-error/60 hover:bg-terminal-error transition-colors"
                title="Go back"
              />
              <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
            </div>
            {/* Terminal path */}
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-terminal-text-secondary">~/shot</span>
              <span className="text-terminal-text-dim">~</span>
              <span className="text-terminal-accent">comments</span>
            </div>
          </div>
          <span className="font-mono text-xs text-terminal-text-dim">
            {total > 0 ? `${total} comment${total !== 1 ? 's' : ''}` : 'no comments'}
          </span>
        </div>

        {/* Shot preview */}
        {shotLoading ? (
          <div className="p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-16 h-16 rounded-md bg-terminal-bg-hover" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-terminal-bg-hover rounded mb-2" />
                <div className="h-3 w-32 bg-terminal-bg-hover rounded" />
              </div>
            </div>
          </div>
        ) : shot && (
          <div className="p-4">
            <div className="flex gap-3">
              <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 border border-terminal-border">
                <Image
                  src={shot.imageUrl}
                  alt="Shot preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/profile/${shot.user.username}`}
                  className="font-mono text-sm text-terminal-text-secondary hover:text-terminal-accent transition-colors"
                >
                  @{shot.user.username}
                </Link>
                {shot.prompt && (
                  <p className="text-sm text-terminal-text-dim truncate font-mono mt-1">
                    <span className="text-terminal-accent">&gt;</span> {shot.prompt}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4 scrollbar-terminal">
        {/* Load more at top */}
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadMore}
              disabled={isLoadingMore}
              className="font-mono text-xs text-terminal-text-dim hover:text-terminal-accent transition-colors"
            >
              {isLoadingMore ? '[ loading... ]' : '[ load earlier comments ]'}
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-terminal-bg-card border border-terminal-border rounded-lg p-8 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-terminal-text-secondary font-mono text-sm">
              // no comments yet. be the first!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="bg-terminal-bg-card border border-terminal-border rounded-lg p-3 relative group">
                  <div className="flex gap-3">
                    <Link href={`/profile/${comment.user.username}`}>
                      <Avatar
                        src={comment.user.avatarUrl}
                        alt={comment.user.displayName}
                        size="sm"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${comment.user.username}`}
                          className="font-mono text-sm text-terminal-text-secondary hover:text-terminal-accent transition-colors"
                        >
                          @{comment.user.username}
                        </Link>
                        <span className="text-xs text-terminal-text-dim font-mono">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words text-terminal-text">
                        {comment.content}
                      </p>
                    </div>

                    {/* Delete button - only for own comments */}
                    {user?.id === comment.user.id && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-terminal-text-dim hover:text-terminal-error"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Fixed input bar at bottom */}
      {user ? (
        <div className="flex-shrink-0 pt-4 border-t border-terminal-border">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Avatar
              src={user.avatarUrl}
              alt={user.displayName || user.username}
              size="sm"
            />
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={1000}
                placeholder="$ add a comment..."
                className="w-full px-4 py-2.5 pr-20 rounded-md font-mono text-sm
                           bg-terminal-bg border border-terminal-border text-terminal-text
                           placeholder-terminal-text-dim
                           focus:outline-none focus:ring-1 focus:ring-terminal-accent/30 focus:border-terminal-accent
                           transition-all"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isAddingComment}
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded font-mono text-sm transition-all",
                  newComment.trim() && !isAddingComment
                    ? "bg-terminal-accent text-white hover:brightness-110"
                    : "bg-terminal-bg-hover text-terminal-text-dim cursor-not-allowed"
                )}
              >
                {isAddingComment ? '...' : 'Post'}
              </button>
            </div>
          </form>
          <div className="text-xs text-right mt-1 font-mono text-terminal-text-dim">
            {newComment.length}/1000
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 bg-terminal-bg-card border border-terminal-border rounded-lg p-4 text-center">
          <p className="text-terminal-text-secondary font-mono text-sm">
            <Link href="/login" className="text-terminal-accent hover:underline">
              $ sign_in
            </Link>{' '}
            // to leave a comment
          </p>
        </div>
      )}
    </div>
  );
}
