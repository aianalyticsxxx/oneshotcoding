'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { getGitHubOAuthUrl, getTwitterOAuthUrl } from '@/lib/auth';

// Dynamically import 3D components (no SSR - Three.js needs browser APIs)
const LaptopScene = dynamic(
  () => import('@/components/three/LaptopScene').then(mod => ({ default: mod.LaptopScene })),
  { ssr: false }
);

const ScreenContent = dynamic(
  () => import('@/components/three/ScreenContent').then(mod => ({ default: mod.ScreenContent })),
  { ssr: false }
);

// Mobile login content component
function MobileLoginContent() {
  const handleGitHubLogin = () => {
    window.location.href = getGitHubOAuthUrl();
  };

  const handleXLogin = () => {
    window.location.href = getTwitterOAuthUrl();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center px-6 py-12 w-full max-w-sm mx-auto"
    >
      {/* Logo */}
      <div className="mb-4">
        <svg width="72" height="72" viewBox="0 0 100 100" fill="none" style={{ filter: 'drop-shadow(0 0 16px rgba(217,119,6,0.5))' }}>
          <circle cx="50" cy="50" r="42" stroke="#D97706" strokeWidth="8" />
          <circle cx="50" cy="50" r="22" stroke="#D97706" strokeWidth="8" />
          <circle cx="50" cy="50" r="8" fill="#D97706" />
        </svg>
      </div>

      {/* Command line style title */}
      <p className="text-xs text-neutral-500 tracking-widest mb-2 font-mono">
        $ welcome to
      </p>

      {/* Title */}
      <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
        OneShotCoding
      </h1>

      {/* Tagline */}
      <p className="text-sm text-neutral-500 tracking-wide mb-8 font-mono">
        ship your daily build
      </p>

      {/* GitHub Login Button */}
      <button
        onClick={handleGitHubLogin}
        className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl text-base font-semibold shadow-lg shadow-amber-600/30 active:scale-[0.98] transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
          />
        </svg>
        Continue with GitHub
      </button>

      {/* Divider */}
      <p className="text-xs text-neutral-500 my-4 font-mono">or</p>

      {/* X Login Button */}
      <button
        onClick={handleXLogin}
        className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-black text-white border border-neutral-700 rounded-xl text-base font-semibold active:scale-[0.98] transition-transform"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Continue with X
      </button>

      {/* Community tagline */}
      <p className="mt-8 text-xs text-neutral-600 tracking-wide font-mono">
        join the dev community
      </p>

      {/* Footer */}
      <p className="mt-auto pt-12 text-[10px] text-neutral-700 text-center">
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-amber-600/70 underline">Terms</a>
        {' & '}
        <a href="/privacy" className="text-amber-600/70 underline">Privacy</a>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [sceneReady, setSceneReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Delay scene mount for smoother transition
  useEffect(() => {
    const timer = setTimeout(() => setSceneReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Loading state
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-terminal-bg">
        <div className="w-8 h-8 border-2 border-terminal-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Deep dark background with gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #171717 0%, #0D0D0D 50%, #050505 100%)',
        }}
      />

      {/* Subtle grid overlay - dot pattern for terminal feel */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Floating accent orbs - warm orange tones */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #D97706 0%, transparent 70%)',
          top: '-200px',
          left: '-200px',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #F59E0B 0%, transparent 70%)',
          bottom: '-150px',
          right: '-150px',
        }}
      />

      {/* Mobile: Show flat login UI */}
      {isMobile && (
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <MobileLoginContent />
        </div>
      )}

      {/* Desktop: 3D Laptop Scene */}
      {!isMobile && (
        <AnimatePresence>
          {sceneReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <LaptopScene>
                <ScreenContent />
              </LaptopScene>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
