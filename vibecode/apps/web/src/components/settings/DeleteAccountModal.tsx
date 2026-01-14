'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import { clearAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export function DeleteAccountModal({ isOpen, onClose, username }: DeleteAccountModalProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isNeumorphic = theme === 'neumorphic';

  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmation === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const { error: apiError } = await api.deleteAccount();

      if (apiError) {
        setError(apiError.message);
        return;
      }

      clearAuth();
      showToast('Your account has been deleted', 'success');
      router.replace('/login');
    } catch {
      setError('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmation('');
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel className="w-full max-w-md" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn(
                  'text-xl font-bold text-red-400',
                )}>
                  Delete Account
                </h2>
                <button
                  onClick={handleClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isNeumorphic
                      ? 'hover:bg-neumorphic-dark/20 text-neumorphic-text'
                      : 'hover:bg-white/10 text-white/60'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={cn(
                'p-4 rounded-lg mb-4',
                'bg-red-500/10 border border-red-500/30'
              )}>
                <p className="text-red-300 text-sm font-medium mb-2">
                  Warning: This action cannot be undone.
                </p>
                <p className="text-red-300/80 text-sm">
                  Deleting your account will:
                </p>
                <ul className="text-red-300/70 text-sm mt-2 space-y-1 ml-4 list-disc">
                  <li>Remove your profile and personal information</li>
                  <li>Anonymize your username to &quot;deleted_user&quot;</li>
                  <li>Keep your posts for 30 days, then permanently delete them</li>
                  <li>Log you out of all devices</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className={cn(
                  'block text-sm font-medium mb-2',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-white/80'
                )}>
                  Type <span className="font-mono text-red-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl transition-all duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-red-500/50',
                    isNeumorphic
                      ? 'bg-neumorphic-dark text-neumorphic-text shadow-neu-inset'
                      : 'bg-white/10 text-white border border-white/20 placeholder:text-white/40',
                    'font-mono'
                  )}
                />
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm mb-4"
                >
                  {error}
                </motion.div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!isConfirmed || isDeleting}
                  className={cn(
                    'flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                    isConfirmed
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-600/30 text-red-300/50 cursor-not-allowed',
                    isDeleting && 'opacity-50 cursor-wait'
                  )}
                >
                  {isDeleting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Deleting...
                    </span>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>

              <p className={cn(
                'text-xs text-center mt-4',
                isNeumorphic ? 'text-neumorphic-muted' : 'text-white/40'
              )}>
                Logged in as @{username}
              </p>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
