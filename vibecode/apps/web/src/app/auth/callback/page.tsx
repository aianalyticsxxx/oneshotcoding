'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

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
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassPanel className="max-w-sm w-full text-center" padding="lg">
          <div className="text-5xl mb-4">😔</div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Authentication Failed
          </h1>
          <p className="text-white/60 mb-6">{error}</p>
          <Button variant="gradient" onClick={() => router.push('/login')}>
            Try Again
          </Button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {/* Animated sparkle */}
        <motion.div
          className="text-6xl mb-6"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          ✨
        </motion.div>

        {/* Loading text */}
        <h1 className="text-2xl font-bold gradient-text mb-4">
          {isProcessing ? 'Logging you in...' : 'Almost there...'}
        </h1>

        {/* Loading spinner */}
        <motion.div
          className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full mx-auto"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.p
          className="mt-4 text-white/50 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Setting up your vibes...
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
