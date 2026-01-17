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
          d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
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
