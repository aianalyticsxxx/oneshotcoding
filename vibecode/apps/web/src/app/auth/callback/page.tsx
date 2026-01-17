'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const success = searchParams.get('success');
      const errorParam = searchParams.get('error');
      const accessToken = searchParams.get('accessToken');
      const refreshToken = searchParams.get('refreshToken');

      if (errorParam) {
        const errorMessages: Record<string, string> = {
          oauth_failed: 'GitHub authentication failed. Please try again.',
          csrf_validation_failed: 'Security validation failed. Please try again.',
        };
        setError(errorMessages[errorParam] || decodeURIComponent(errorParam));
        setIsProcessing(false);
        return;
      }

      if (success === 'true' && accessToken) {
        // Store tokens received from OAuth callback
        try {
          // Store access token in localStorage (used by API client)
          localStorage.setItem('oneshotcoding_token', accessToken);

          // Also store in cookies for cross-domain scenarios
          const isSecure = window.location.protocol === 'https:';
          document.cookie = `access_token=${accessToken}; path=/; max-age=${15 * 60}; samesite=lax${isSecure ? '; secure' : ''}`;
          if (refreshToken) {
            document.cookie = `refresh_token=${refreshToken}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax${isSecure ? '; secure' : ''}`;
          }

          // Clean up URL (remove tokens from browser history)
          window.history.replaceState({}, '', '/auth/callback?success=true');

          // Verify auth and redirect
          await refreshAuth();
          router.replace('/');
        } catch (err) {
          console.error('Auth callback error:', err);
          setError('Failed to complete login. Please try again.');
          setIsProcessing(false);
        }
        return;
      }

      // No success or error - unexpected state
      setError('Authentication incomplete. Please try again.');
      setIsProcessing(false);
    };

    processCallback();
  }, [searchParams, refreshAuth, router]);

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
