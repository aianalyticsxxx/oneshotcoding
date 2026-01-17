'use client';

import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-terminal-bg/95 backdrop-blur-sm border-b border-terminal-border',
        'safe-top',
        className
      )}
    >
      <div className="px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 100 100" fill="none" className="text-terminal-accent">
            <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="8" />
            <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="8" />
            <circle cx="50" cy="50" r="8" fill="currentColor" />
          </svg>
          <span className="font-semibold text-lg text-terminal-text">oneshotcoding</span>
        </Link>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              {user.isAdmin && (
                <Link
                  href="/admin-panel"
                  className="py-1.5 px-3 rounded-md font-mono text-sm
                             bg-terminal-bg-elevated border border-terminal-border
                             text-terminal-accent hover:border-terminal-accent/50 transition-colors"
                >
                  Admin
                </Link>
              )}
              <Link
                href={`/profile/${user.username}`}
                className="flex items-center gap-2 py-1.5 px-3 rounded-md
                           bg-terminal-bg-elevated border border-terminal-border
                           hover:border-terminal-border-bright transition-colors"
              >
                <Avatar
                  src={user.avatarUrl}
                  alt={user.displayName}
                  size="sm"
                />
                <span className="font-mono text-sm text-terminal-text-secondary hidden sm:inline">
                  @{user.username}
                </span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
