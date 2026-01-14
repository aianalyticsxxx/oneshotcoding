'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { DeleteAccountModal } from '@/components/settings/DeleteAccountModal';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-terminal-bg px-4 py-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-terminal-text font-mono">./settings</h1>
          <p className="text-terminal-text-dim text-sm mt-1 font-mono">
            Manage your account
          </p>
        </motion.div>

        {/* Account Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassPanel className="mb-4">
            <h2 className={cn(
              'text-lg font-semibold mb-4 font-mono',
              isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
            )}>
              Account
            </h2>

            <div className="space-y-3">
              <div className={cn(
                'flex items-center justify-between py-3 border-b',
                isNeumorphic ? 'border-neumorphic-dark/20' : 'border-terminal-border'
              )}>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                  )}>
                    Username
                  </p>
                  <p className={cn(
                    'text-sm font-mono',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                  )}>
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className={cn(
                'flex items-center justify-between py-3 border-b',
                isNeumorphic ? 'border-neumorphic-dark/20' : 'border-terminal-border'
              )}>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                  )}>
                    Connected via
                  </p>
                  <p className={cn(
                    'text-sm',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                  )}>
                    GitHub OAuth
                  </p>
                </div>
                <div className="flex items-center gap-2 text-terminal-text-dim">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                  </svg>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="w-full justify-center"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        {/* Legal Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="mb-4">
            <h2 className={cn(
              'text-lg font-semibold mb-4 font-mono',
              isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
            )}>
              Legal
            </h2>

            <div className="space-y-2">
              <Link
                href="/terms"
                className={cn(
                  'flex items-center justify-between py-3 rounded-lg px-3 -mx-3 transition-colors',
                  isNeumorphic
                    ? 'hover:bg-neumorphic-dark/10'
                    : 'hover:bg-terminal-bg-elevated'
                )}
              >
                <span className={cn(
                  'text-sm',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                )}>
                  Terms of Service
                </span>
                <svg className="w-4 h-4 text-terminal-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href="/privacy"
                className={cn(
                  'flex items-center justify-between py-3 rounded-lg px-3 -mx-3 transition-colors',
                  isNeumorphic
                    ? 'hover:bg-neumorphic-dark/10'
                    : 'hover:bg-terminal-bg-elevated'
                )}
              >
                <span className={cn(
                  'text-sm',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                )}>
                  Privacy Policy
                </span>
                <svg className="w-4 h-4 text-terminal-text-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </GlassPanel>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassPanel className="border border-red-500/20">
            <h2 className="text-lg font-semibold mb-2 font-mono text-red-400">
              Danger Zone
            </h2>
            <p className={cn(
              'text-sm mb-4',
              isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
            )}>
              Once you delete your account, there is no going back. Please be certain.
            </p>

            <button
              onClick={() => setShowDeleteModal(true)}
              className={cn(
                'w-full px-4 py-3 rounded-xl font-medium transition-all duration-200',
                'bg-red-500/10 border border-red-500/30 text-red-400',
                'hover:bg-red-500/20 hover:border-red-500/50'
              )}
            >
              Delete Account
            </button>
          </GlassPanel>
        </motion.div>

        {/* Version info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-terminal-text-dim/50 text-xs mt-6 font-mono"
        >
          OneShotCoding v1.0
        </motion.p>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        username={user.username}
      />
    </div>
  );
}
