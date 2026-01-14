'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { api } from '@/lib/api';

type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user' | 'shot' | 'comment';
  targetId: string;
  targetName?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Spam', description: 'Advertising, scams, or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying, threats, or targeted abuse' },
  { value: 'inappropriate', label: 'Inappropriate', description: 'Adult content, violence, or disturbing material' },
  { value: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { value: 'other', label: 'Other', description: 'Something else not listed above' },
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetName }: ReportModalProps) {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isNeumorphic = theme === 'neumorphic';

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedReason) return;

    if (selectedReason === 'other' && details.trim().length === 0) {
      setError('Please provide details for your report');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reportData: Parameters<typeof api.createReport>[0] = {
        reason: selectedReason,
        details: details.trim() || undefined,
      };

      if (targetType === 'user') {
        reportData.reportedUserId = targetId;
      } else if (targetType === 'shot') {
        reportData.reportedShotId = targetId;
      } else if (targetType === 'comment') {
        reportData.reportedCommentId = targetId;
      }

      const { error: apiError } = await api.createReport(reportData);

      if (apiError) {
        setError(apiError.message);
        return;
      }

      showToast('Report submitted. Thank you for helping keep the community safe.', 'success');
      handleClose();
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setDetails('');
    setError(null);
    onClose();
  };

  const getTargetLabel = () => {
    if (targetName) return targetName;
    switch (targetType) {
      case 'user': return 'this user';
      case 'shot': return 'this post';
      case 'comment': return 'this comment';
      default: return 'this content';
    }
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
            className="w-full max-w-md"
          >
            <GlassPanel padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn(
                  'text-xl font-bold',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                )}>
                  Report {targetType === 'user' ? 'User' : targetType === 'shot' ? 'Post' : 'Comment'}
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

              <p className={cn(
                'text-sm mb-4',
                isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
              )}>
                Why are you reporting {getTargetLabel()}?
              </p>

              {/* Reason selection */}
              <div className="space-y-2 mb-4">
                {REPORT_REASONS.map((reason) => (
                  <button
                    key={reason.value}
                    type="button"
                    onClick={() => setSelectedReason(reason.value)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all duration-200',
                      selectedReason === reason.value
                        ? 'border-terminal-accent bg-terminal-accent/10'
                        : isNeumorphic
                          ? 'border-neumorphic-dark/20 hover:border-neumorphic-dark/40'
                          : 'border-terminal-border hover:border-terminal-border-bright'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        selectedReason === reason.value
                          ? 'border-terminal-accent'
                          : 'border-terminal-text-dim'
                      )}>
                        {selectedReason === reason.value && (
                          <div className="w-2 h-2 rounded-full bg-terminal-accent" />
                        )}
                      </div>
                      <div>
                        <p className={cn(
                          'font-medium text-sm',
                          isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                        )}>
                          {reason.label}
                        </p>
                        <p className={cn(
                          'text-xs',
                          isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                        )}>
                          {reason.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Details textarea (always visible but required for 'other') */}
              <div className="mb-4">
                <label className={cn(
                  'block text-sm font-medium mb-2',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text-secondary'
                )}>
                  Additional details {selectedReason === 'other' ? '(required)' : '(optional)'}
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context..."
                  maxLength={1000}
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl transition-all duration-200 resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-terminal-accent/50',
                    isNeumorphic
                      ? 'bg-neumorphic-dark text-neumorphic-text shadow-neu-inset'
                      : 'bg-white/10 text-white border border-white/20 placeholder:text-white/40'
                  )}
                />
                <p className={cn(
                  'text-xs mt-1',
                  isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                )}>
                  {details.length}/1000 characters
                </p>
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  onClick={handleSubmit}
                  disabled={!selectedReason || isSubmitting}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  Submit Report
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
