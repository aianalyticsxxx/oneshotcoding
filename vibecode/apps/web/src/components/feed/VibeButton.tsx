'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

export interface VibeButtonProps {
  vibeId: string;
  sparkleCount: number;
  hasSparkled: boolean;
  className?: string;
}

export function VibeButton({
  vibeId,
  sparkleCount: initialCount,
  hasSparkled: initialSparkled,
  className,
}: VibeButtonProps) {
  const [sparkleCount, setSparkleCount] = useState(initialCount);
  const [hasSparkled, setHasSparkled] = useState(initialSparkled);
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<number[]>([]);

  const handleSparkle = useCallback(async () => {
    // Optimistic update
    const wasSparkled = hasSparkled;
    setHasSparkled(!wasSparkled);
    setSparkleCount((prev) => prev + (wasSparkled ? -1 : 1));

    // Trigger animation only when adding sparkle
    if (!wasSparkled) {
      setIsAnimating(true);
      // Add particles
      setParticles(Array.from({ length: 8 }, (_, i) => i));
      setTimeout(() => {
        setIsAnimating(false);
        setParticles([]);
      }, 700);
    }

    // API call
    try {
      if (wasSparkled) {
        await api.unsparkleVibe(vibeId);
      } else {
        await api.sparkleVibe(vibeId);
      }
    } catch (error) {
      // Revert on error
      setHasSparkled(wasSparkled);
      setSparkleCount((prev) => prev + (wasSparkled ? 1 : -1));
      console.error('Failed to sparkle:', error);
    }
  }, [vibeId, hasSparkled]);

  return (
    <button
      onClick={handleSparkle}
      className={cn(
        'relative flex items-center gap-1.5 py-1.5 px-2 rounded-md',
        'transition-all duration-200 font-mono text-sm',
        hasSparkled
          ? 'text-terminal-accent'
          : 'text-terminal-text-secondary hover:text-terminal-text',
        className
      )}
    >
      {/* Sparkle icon */}
      <motion.div
        className="relative"
        animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <motion.svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill={hasSparkled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          animate={isAnimating ? { rotate: [0, 15, -15, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </motion.svg>

        {/* Particle explosion */}
        <AnimatePresence>
          {particles.map((i) => (
            <motion.div
              key={i}
              className="absolute top-1/2 left-1/2 w-1 h-1 rounded-full bg-terminal-accent"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos((i * Math.PI) / 4) * 24,
                y: Math.sin((i * Math.PI) / 4) * 24,
                opacity: 0,
                scale: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Count */}
      <AnimatePresence mode="wait">
        <motion.span
          key={sparkleCount}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="tabular-nums"
        >
          {sparkleCount > 0 ? sparkleCount : ''}
        </motion.span>
      </AnimatePresence>

      {/* Ripple effect */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 rounded-md bg-terminal-accent/20"
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </button>
  );
}
