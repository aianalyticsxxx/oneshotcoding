'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import type { DualCaptureResult } from './DualCapture';

export interface DualPhotoPreviewProps {
  photos: DualCaptureResult;
  onPost: (caption: string) => void;
  onRetake: () => void;
  isPosting: boolean;
}

export function DualPhotoPreview({
  photos,
  onPost,
  onRetake,
  isPosting,
}: DualPhotoPreviewProps) {
  const [caption, setCaption] = useState('');

  const issueCodeUrl = useMemo(() => URL.createObjectURL(photos.issueCode), [photos.issueCode]);
  const fixCodeUrl = useMemo(() => URL.createObjectURL(photos.fixCode), [photos.fixCode]);

  const handlePost = () => {
    onPost(caption);
  };

  return (
    <div className="space-y-4">
      {/* Dual photo display - Bug → Fix style */}
      <div className="relative">
        {/* Main image: Fix code (full width) - the solution */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
          <img
            src={fixCodeUrl}
            alt="Fixed code"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Issue code overlay (small, in corner) - the bug */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute top-3 left-3 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-red-500 shadow-lg"
        >
          <img
            src={issueCodeUrl}
            alt="Bug code"
            className="w-full h-full object-cover"
          />
          {/* Bug indicator */}
          <div className="absolute bottom-0 left-0 right-0 bg-red-500/90 py-0.5 text-center">
            <span className="text-[10px] text-white font-medium">🐛 BUG</span>
          </div>
        </motion.div>

        {/* Labels */}
        <div className="absolute bottom-3 right-3 flex gap-2">
          <span className="bg-green-500/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white font-medium">
            ✨ FIX
          </span>
        </div>
      </div>

      {/* Caption input */}
      <GlassPanel padding="none">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What did you fix?"
          maxLength={280}
          rows={3}
          className="w-full bg-transparent border-none resize-none p-4 text-white placeholder-white/40 focus:outline-none focus:ring-0"
        />
        <div className="px-4 pb-3 flex justify-between items-center border-t border-glass-border pt-2">
          <span className="text-white/40 text-sm">{caption.length}/280</span>
          <div className="flex gap-2">
            {/* Emoji suggestions */}
            <button
              onClick={() => setCaption(caption + ' 🐛')}
              className="text-lg hover:scale-110 transition-transform"
            >
              🐛
            </button>
            <button
              onClick={() => setCaption(caption + ' ✨')}
              className="text-lg hover:scale-110 transition-transform"
            >
              ✨
            </button>
            <button
              onClick={() => setCaption(caption + ' 🔥')}
              className="text-lg hover:scale-110 transition-transform"
            >
              🔥
            </button>
            <button
              onClick={() => setCaption(caption + ' 🚀')}
              className="text-lg hover:scale-110 transition-transform"
            >
              🚀
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="glass"
          onClick={onRetake}
          disabled={isPosting}
          className="flex-1"
        >
          Retake
        </Button>
        <Button
          variant="gradient"
          onClick={handlePost}
          disabled={isPosting}
          className="flex-1"
        >
          {isPosting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting...
            </span>
          ) : (
            'Share Fix ✨'
          )}
        </Button>
      </div>
    </div>
  );
}
