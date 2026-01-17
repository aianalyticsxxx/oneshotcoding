'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/feed/explore', label: './explore', icon: '◈', requiresAuth: false },
  { href: '/feed/following', label: './following', icon: '◇', requiresAuth: true },
] as const;

export function FeedNavigation() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="flex items-center gap-1.5 p-1 bg-terminal-bg rounded-lg border border-terminal-border">
      {navItems.map((item, index) => {
        if (item.requiresAuth && !user) return null;

        const isActive = pathname === item.href ||
          (item.href === '/feed/explore' && pathname === '/feed');

        return (
          <Link key={item.href} href={item.href}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                relative font-mono text-sm py-2 px-4 rounded-md transition-all cursor-pointer
                flex items-center gap-2 group
                ${isActive
                  ? 'bg-terminal-accent/15 text-terminal-accent'
                  : 'text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-elevated'
                }
              `}
            >
              <span className={`
                transition-all duration-200
                ${isActive ? 'text-terminal-accent' : 'text-terminal-text-dim group-hover:text-terminal-accent'}
              `}>
                {item.icon}
              </span>
              <span>{item.label}</span>

              {isActive && (
                <motion.div
                  layoutId="feed-nav-indicator"
                  className="absolute inset-0 border border-terminal-accent/50 rounded-md"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}

      {/* Terminal cursor blink */}
      <div className="ml-auto flex items-center gap-2 px-3 py-2">
        <span className="w-2 h-4 bg-terminal-accent animate-cursor-blink" />
      </div>
    </nav>
  );
}
