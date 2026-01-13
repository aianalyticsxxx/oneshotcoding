'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const success = searchParams.get('success');
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      console.log('[Auth Callback] Params:', { success, hasToken: !!token, errorParam, url: window.location.href });

      if (errorParam) {
        setError(errorParam === 'oauth_failed'
          ? 'GitHub authentication failed. Please try again.'
          : decodeURIComponent(errorParam));
        setIsProcessing(false);
        return;
      }

      if (success === 'true' && token) {
        // Store the token and fetch user data
        try {
          console.log('[Auth Callback] Calling login with token...');
          await login(token);
          console.log('[Auth Callback] Login successful, redirecting to /');
          router.replace('/');
        } catch (err) {
          console.error('[Auth Callback] Login error:', err);
          setError('Failed to complete login. Please try again.');
          setIsProcessing(false);
        }
        return;
      }

      // No success or error - unexpected state
      console.log('[Auth Callback] Missing success/token, showing error');
      setError('Authentication incomplete. Please try again.');
      setIsProcessing(false);
    };

    processCallback();
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center bg-terminal-bg-elevated border border-terminal-border rounded-lg p-6">
          <div className="font-mono text-terminal-error text-sm mb-4">ERROR</div>
          <h1 className="font-mono text-lg text-terminal-text mb-2">
            Authentication Failed
          </h1>
          <p className="text-terminal-text-secondary text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="font-mono text-sm py-2 px-4 rounded border border-terminal-accent text-terminal-accent hover:bg-terminal-accent/10 transition-colors"
          >
            ./retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        {/* Terminal-style loading */}
        <div className="font-mono text-terminal-text-secondary text-sm mb-4">
          <span className="text-terminal-accent">$</span> auth --login
        </div>

        {/* Loading spinner */}
        <motion.div
          className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.p
          className="font-mono text-terminal-text text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {isProcessing ? 'Authenticating...' : 'Redirecting...'}
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
