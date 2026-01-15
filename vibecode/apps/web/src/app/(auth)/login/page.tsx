'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';

// Dynamically import 3D components (no SSR - Three.js needs browser APIs)
const LaptopScene = dynamic(
  () => import('@/components/three/LaptopScene').then(mod => ({ default: mod.LaptopScene })),
  { ssr: false }
);

const ScreenContent = dynamic(
  () => import('@/components/three/ScreenContent').then(mod => ({ default: mod.ScreenContent })),
  { ssr: false }
);

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

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

      {/* 3D Laptop Scene */}
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

    </div>
  );
}
