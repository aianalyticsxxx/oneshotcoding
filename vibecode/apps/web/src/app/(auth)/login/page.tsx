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
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-8 h-8 border-2 border-bereal-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Deep dark background with gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, #0f1020 0%, #0a0a0f 50%, #050508 100%)',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating accent orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #00ffff 0%, transparent 70%)',
          top: '-200px',
          left: '-200px',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #ff00ff 0%, transparent 70%)',
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

      {/* Instructions overlay */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center pointer-events-none"
      >
        <p className="text-white/30 text-sm font-light tracking-wider">
          Drag to orbit • Scroll to zoom
        </p>
      </motion.div>

      {/* Brand watermark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute top-6 left-6 pointer-events-none"
      >
        <span className="text-white/10 text-xs font-mono tracking-widest uppercase">
          OneShotCoding v1.0
        </span>
      </motion.div>
    </div>
  );
}
