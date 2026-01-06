'use client';

import { useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export interface DualCaptureResult {
  issueCode: Blob;  // First screenshot - the bug/issue (shown smaller)
  fixCode: Blob;    // Second screenshot - the fix (shown larger as background)
}

export interface DualCaptureProps {
  onCapture: (result: DualCaptureResult) => void;
  className?: string;
}

type CaptureStep = 'ready' | 'capturing_issue' | 'issue_captured' | 'capturing_fix' | 'complete';

export function DualCapture({ onCapture, className }: DualCaptureProps) {
  const [step, setStep] = useState<CaptureStep>('ready');
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issueCodeBlob, setIssueCodeBlob] = useState<Blob | null>(null);
  const [issuePreviewUrl, setIssuePreviewUrl] = useState<string | null>(null);

  // Capture screenshot using Screen Capture API
  const captureScreenshot = useCallback((label: string): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
        // Request screen capture permission
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          },
          audio: false,
        });

        // Create video element to capture frame
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();

        // Wait for the screen share picker to fully close
        await new Promise(r => setTimeout(r, 500));

        // Capture frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(video, 0, 0);

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());

          // Convert to blob
          canvas.toBlob((blob) => {
            console.log(`${label} captured:`, blob?.size);
            resolve(blob);
          }, 'image/jpeg', 0.9);
        } else {
          stream.getTracks().forEach(track => track.stop());
          resolve(null);
        }
      } catch (err) {
        console.error(`${label} capture error:`, err);
        resolve(null);
      }
    });
  }, []);

  // Step 1: Capture the issue/bug code screenshot
  const captureIssueCode = useCallback(async () => {
    setError(null);
    setStep('capturing_issue');
    setIsCapturing(true);

    try {
      const issueBlob = await captureScreenshot('Issue code');

      if (!issueBlob) {
        setError('Screen sharing was denied. Please allow screen capture.');
        setStep('ready');
        setIsCapturing(false);
        return;
      }

      // Store the issue code and show preview
      setIssueCodeBlob(issueBlob);
      setIssuePreviewUrl(URL.createObjectURL(issueBlob));
      setStep('issue_captured');
      setIsCapturing(false);
    } catch (err) {
      console.error('Issue capture error:', err);
      setError('Failed to capture issue code. Please try again.');
      setStep('ready');
      setIsCapturing(false);
    }
  }, [captureScreenshot]);

  // Step 2: Capture the fix code screenshot
  const captureFixCode = useCallback(async () => {
    if (!issueCodeBlob) {
      setError('Please capture the issue code first.');
      return;
    }

    setError(null);
    setStep('capturing_fix');
    setIsCapturing(true);

    try {
      const fixBlob = await captureScreenshot('Fix code');

      if (!fixBlob) {
        setError('Screen sharing was denied. Please allow screen capture.');
        setStep('issue_captured');
        setIsCapturing(false);
        return;
      }

      // Flash effect
      setTimeout(() => setIsCapturing(false), 200);

      // Success! Call onCapture with both screenshots
      onCapture({ issueCode: issueCodeBlob, fixCode: fixBlob });
      setStep('complete');
    } catch (err) {
      console.error('Fix capture error:', err);
      setError('Failed to capture fix code. Please try again.');
      setStep('issue_captured');
      setIsCapturing(false);
    }
  }, [captureScreenshot, issueCodeBlob, onCapture]);

  // Reset to start over
  const resetCapture = useCallback(() => {
    if (issuePreviewUrl) {
      URL.revokeObjectURL(issuePreviewUrl);
    }
    setIssueCodeBlob(null);
    setIssuePreviewUrl(null);
    setStep('ready');
    setError(null);
  }, [issuePreviewUrl]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
          step === 'ready' || step === 'capturing_issue'
            ? 'bg-vibe-purple/30 text-vibe-purple-light border border-vibe-purple/50'
            : step === 'issue_captured' || step === 'capturing_fix' || step === 'complete'
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : 'bg-white/10 text-white/50'
        )}>
          <span className="w-5 h-5 rounded-full bg-current/30 flex items-center justify-center text-xs">1</span>
          <span>Issue</span>
          {(step === 'issue_captured' || step === 'capturing_fix' || step === 'complete') && <span>✓</span>}
        </div>
        <div className="w-8 h-0.5 bg-white/20" />
        <div className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
          step === 'issue_captured' || step === 'capturing_fix'
            ? 'bg-vibe-purple/30 text-vibe-purple-light border border-vibe-purple/50'
            : step === 'complete'
              ? 'bg-green-500/30 text-green-300 border border-green-500/50'
              : 'bg-white/10 text-white/50'
        )}>
          <span className="w-5 h-5 rounded-full bg-current/30 flex items-center justify-center text-xs">2</span>
          <span>Fix</span>
          {step === 'complete' && <span>✓</span>}
        </div>
      </div>

      <div className="relative">
        {/* Preview area */}
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/10">
          {/* Issue code preview (when captured) */}
          {issuePreviewUrl && (
            <div className="absolute inset-0">
              <img
                src={issuePreviewUrl}
                alt="Issue code"
                className="w-full h-full object-contain"
              />
              {/* Overlay showing this will be the small one */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-black/70 px-4 py-2 rounded-lg text-center">
                  <p className="text-white/80 text-sm">Issue captured</p>
                  <p className="text-white/50 text-xs">This will be the small overlay</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!issuePreviewUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🐛</div>
              <p className="text-white/60 text-center px-4">
                Capture a screenshot of your <span className="text-red-400 font-semibold">buggy code</span>
              </p>
            </div>
          )}

          {/* Capture flash effect */}
          <AnimatePresence>
            {isCapturing && (
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white z-20"
              />
            )}
          </AnimatePresence>

          {/* Corner guides */}
          <div className="absolute inset-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
          </div>

          {/* Status badge */}
          <div className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2">
            {step === 'ready' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs text-white">Step 1: Capture Issue</span>
              </>
            )}
            {step === 'capturing_issue' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white">Capturing...</span>
              </>
            )}
            {step === 'issue_captured' && (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-white">Step 2: Capture Fix</span>
              </>
            )}
            {step === 'capturing_fix' && (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white">Capturing fix...</span>
              </>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3"
          >
            <p className="text-red-200 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {/* Reset button (when issue is captured) */}
          {step === 'issue_captured' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={resetCapture}
              className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>
          )}

          {/* Spacer when no reset button */}
          {step !== 'issue_captured' && <div className="w-12 h-12" />}

          {/* Main capture button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={step === 'issue_captured' ? captureFixCode : captureIssueCode}
            disabled={isCapturing}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-glow disabled:opacity-50"
          >
            {isCapturing ? (
              <div className="w-16 h-16 rounded-full bg-gradient-vibe flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <motion.div
                  className={cn(
                    "w-16 h-16 rounded-full",
                    step === 'issue_captured' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'
                  )}
                  whileHover={{ scale: 1.05 }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">{step === 'issue_captured' ? '✨' : '🐛'}</span>
                </div>
              </>
            )}
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="w-12 h-12" />
        </div>

        {/* Instruction text */}
        <p className="text-center text-white/50 text-sm mt-4">
          {step === 'ready' && 'Tap to capture your buggy code screenshot'}
          {step === 'capturing_issue' && 'Select the window with your issue...'}
          {step === 'issue_captured' && 'Now capture your fixed code!'}
          {step === 'capturing_fix' && 'Select the window with your fix...'}
        </p>
      </div>
    </div>
  );
}
