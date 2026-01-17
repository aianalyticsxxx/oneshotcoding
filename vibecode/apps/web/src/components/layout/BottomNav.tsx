'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export interface BottomNavProps {
  className?: string;
}

const navItems = [
  {
    href: '/discover',
    label: 'discover',
    icon: (active: boolean) => (
      <svg
        className={cn('w-5 h-5', active ? 'text-terminal-accent' : 'text-terminal-text-dim')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    href: '/challenges',
    label: 'challenges',
    icon: (active: boolean) => (
      <svg
        className={cn('w-5 h-5', active ? 'text-terminal-accent' : 'text-terminal-text-dim')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
    ),
  },
  {
    href: '/capture',
    label: 'ship',
    icon: (active: boolean) => (
      <svg
        className={cn('w-5 h-5', active ? 'text-terminal-accent' : 'text-terminal-text-dim')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'profile',
    icon: (active: boolean) => (
      <svg
        className={cn('w-5 h-5', active ? 'text-terminal-accent' : 'text-terminal-text-dim')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
];

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getHref = (href: string) => {
    if (href === '/profile' && user) {
      return `/profile/${user.username}`;
    }
    return href;
  };

  const isActive = (href: string) => {
    if (href === '/profile') {
      return pathname.startsWith('/profile');
    }
    if (href === '/challenges') {
      return pathname.startsWith('/challenges');
    }
    return pathname === href;
  };

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-terminal-bg/95 backdrop-blur-sm border-t border-terminal-border',
        'safe-bottom',
        className
      )}
    >
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={getHref(item.href)}
                className={cn(
                  'relative flex flex-col items-center py-2 px-3 rounded-md transition-colors',
                  active
                    ? 'bg-terminal-accent/10'
                    : 'hover:bg-terminal-bg-elevated'
                )}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="relative"
                >
                  {item.icon(active)}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-terminal-accent rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.div>
                <span
                  className={cn(
                    'text-xs mt-1 font-mono transition-colors',
                    active ? 'text-terminal-accent' : 'text-terminal-text-dim'
                  )}
                >
                  ./{item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
