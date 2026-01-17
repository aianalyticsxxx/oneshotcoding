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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[90vh] flex flex-col"
          >
            <GlassPanel padding="none" className="flex flex-col max-h-[90vh] rounded-b-none sm:rounded-b-2xl">
              {/* Fixed Header */}
              <div className={cn(
                'flex items-center justify-between p-4 border-b shrink-0',
                isNeumorphic ? 'border-neumorphic-dark/20' : 'border-terminal-border'
              )}>
                <h2 className={cn(
                  'text-lg font-bold font-mono',
                  isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                )}>
                  {'>'} report_{targetType}
                </h2>
                <button
                  onClick={handleClose}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    isNeumorphic
                      ? 'hover:bg-neumorphic-dark/20 text-neumorphic-text'
                      : 'hover:bg-terminal-bg-elevated text-terminal-text-dim hover:text-terminal-text'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className={cn(
                  'text-sm font-mono',
                  isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                )}>
                  <span className="text-terminal-accent">$</span> why are you reporting {getTargetLabel()}?
                </p>

                {/* Reason selection - more compact */}
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      type="button"
                      onClick={() => setSelectedReason(reason.value)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border transition-all duration-200',
                        selectedReason === reason.value
                          ? isNeumorphic
                            ? 'border-neumorphic-accent bg-neumorphic-accent/10'
                            : 'border-terminal-accent bg-terminal-accent/10'
                          : isNeumorphic
                            ? 'border-neumorphic-dark/20 hover:border-neumorphic-dark/40 bg-neumorphic-dark/10'
                            : 'border-terminal-border hover:border-terminal-border-bright bg-terminal-bg-elevated/50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                          selectedReason === reason.value
                            ? isNeumorphic ? 'border-neumorphic-accent' : 'border-terminal-accent'
                            : isNeumorphic ? 'border-neumorphic-muted' : 'border-terminal-text-dim'
                        )}>
                          {selectedReason === reason.value && (
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              isNeumorphic ? 'bg-neumorphic-accent' : 'bg-terminal-accent'
                            )} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'font-medium text-sm font-mono',
                            isNeumorphic ? 'text-neumorphic-text' : 'text-terminal-text'
                          )}>
                            {reason.label}
                          </p>
                          <p className={cn(
                            'text-xs truncate',
                            isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                          )}>
                            {reason.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Details textarea */}
                <div>
                  <label className={cn(
                    'block text-xs font-mono mb-2',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                  )}>
                    <span className="text-terminal-accent">#</span> details {selectedReason === 'other' ? '(required)' : '(optional)'}
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Additional context..."
                    maxLength={1000}
                    rows={2}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg transition-all duration-200 resize-none text-sm font-mono',
                      'focus:outline-none focus:ring-2',
                      isNeumorphic
                        ? 'bg-neumorphic-dark text-neumorphic-text shadow-neu-inset focus:ring-neumorphic-accent/50 placeholder:text-neumorphic-muted'
                        : 'bg-terminal-bg-elevated text-terminal-text border border-terminal-border focus:ring-terminal-accent/50 focus:border-terminal-accent placeholder:text-terminal-text-dim'
                    )}
                  />
                  <p className={cn(
                    'text-xs mt-1 font-mono',
                    isNeumorphic ? 'text-neumorphic-muted' : 'text-terminal-text-dim'
                  )}>
                    {details.length}/1000
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'p-3 rounded-lg text-sm font-mono',
                      isNeumorphic
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-red-500/20 border border-red-500/30 text-red-300'
                    )}
                  >
                    <span className="text-red-400">error:</span> {error}
                  </motion.div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className={cn(
                'flex gap-3 p-4 border-t shrink-0',
                isNeumorphic ? 'border-neumorphic-dark/20' : 'border-terminal-border'
              )}>
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
                  Submit
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
