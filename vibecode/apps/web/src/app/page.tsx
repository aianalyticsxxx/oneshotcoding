'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const loadingSteps = [
  { text: 'initializing...', delay: 0 },
  { text: 'checking auth...', delay: 400 },
  { text: 'loading feed...', delay: 800 },
];

export default function HomePage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    // Animate through loading steps
    const timers = loadingSteps.map((step, index) =>
      setTimeout(() => {
        setCurrentStep(index);
        if (index > 0) {
          setCompletedSteps(prev => [...prev, index - 1]);
        }
      }, step.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // Mark auth step complete
    setCompletedSteps(prev => [...prev, 1]);

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Go to feed
    router.replace('/feed');
  }, [authLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-terminal-bg">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md"
      >
        {/* Terminal Window */}
        <div className="bg-terminal-bg-card border border-terminal-border rounded-lg overflow-hidden shadow-terminal">
          {/* Terminal Header */}
          <div className="bg-terminal-bg-elevated px-4 py-3 border-b border-terminal-border flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-terminal-error/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-warning/60" />
              <span className="w-3 h-3 rounded-full bg-terminal-success/60" />
            </div>
            <span className="font-mono text-sm text-terminal-text-secondary">
              oneshotcoding ~ ./init
            </span>
          </div>

          {/* Terminal Body */}
          <div className="p-6 space-y-3">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-terminal-accent">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
                </svg>
              </motion.div>
              <span className="text-xl font-semibold text-terminal-text">
                OneShotCoding
              </span>
            </div>

            {/* Loading Steps */}
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {loadingSteps.map((step, index) => (
                  <motion.div
                    key={step.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: currentStep >= index ? 1 : 0.3,
                      x: 0
                    }}
                    className="flex items-center gap-2 font-mono text-sm"
                  >
                    <span className="text-terminal-accent">&gt;</span>
                    <span className="text-terminal-text-secondary">
                      {step.text}
                    </span>
                    {completedSteps.includes(index) && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-terminal-success ml-1"
                      >
                        ✓
                      </motion.span>
                    )}
                    {currentStep === index && !completedSteps.includes(index) && (
                      <motion.span
                        className="inline-block w-2 h-4 bg-terminal-accent ml-1"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 pt-4 border-t border-terminal-border">
              <div className="font-mono text-xs text-terminal-text-dim mb-2">
                progress
              </div>
              <div className="h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-terminal-accent"
                  initial={{ width: '0%' }}
                  animate={{
                    width: authLoading ? '60%' : isAuthenticated ? '100%' : '80%'
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Status text below terminal */}
        <motion.p
          className="mt-4 text-center text-terminal-text-dim text-sm font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {authLoading
            ? 'authenticating...'
            : !isAuthenticated
            ? 'redirecting to login...'
            : 'opening feed...'}
        </motion.p>
      </motion.div>
    </div>
  );
}
