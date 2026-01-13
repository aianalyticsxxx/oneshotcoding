'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export interface MediaPreviewProps {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  onPost: (prompt: string) => void;
  onRetake: () => void;
  isPosting: boolean;
}

export function MediaPreview({
  mediaUrl,
  mediaType,
  onPost,
  onRetake,
  isPosting,
}: MediaPreviewProps) {
  const [prompt, setPrompt] = useState('');

  const handlePost = () => {
    if (!prompt.trim()) return;
    onPost(prompt);
  };

  return (
    <div className="space-y-4">
      {/* Prompt input (required) - at the top */}
      <GlassPanel padding="none">
        <div className="p-4">
          <label className="block text-sm font-mono text-terminal-accent mb-2">
            &gt; prompt <span className="text-terminal-error">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What prompt did you give Claude?"
            maxLength={1000}
            rows={3}
            autoFocus
            className="w-full bg-terminal-bg-elevated border border-terminal-border rounded-lg resize-none p-3 text-terminal-text placeholder-terminal-text-dim font-mono text-sm focus:outline-none focus:border-terminal-accent"
          />
          <div className="text-right mt-1">
            <span className="text-terminal-text-dim text-xs font-mono">{prompt.length}/1000</span>
          </div>
        </div>
      </GlassPanel>

      {/* Media preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-lg overflow-hidden bg-terminal-bg border border-terminal-border"
      >
        {mediaType === 'video' ? (
          <video
            src={mediaUrl}
            controls
            className="w-full aspect-video object-contain bg-terminal-bg"
          />
        ) : (
          <div className="relative aspect-video">
            <Image
              src={mediaUrl}
              alt="Preview"
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        {/* Output label */}
        <div className="absolute top-3 left-3">
          <span className="bg-terminal-success/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white font-mono">
            output
          </span>
        </div>
      </motion.div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="glass"
          onClick={onRetake}
          disabled={isPosting}
          className="flex-1 font-mono"
        >
          ./choose-different
        </Button>
        <Button
          variant="terminal"
          onClick={handlePost}
          disabled={isPosting || !prompt.trim()}
          className="flex-1"
        >
          {isPosting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              uploading...
            </span>
          ) : (
            './share'
          )}
        </Button>
      </div>
    </div>
  );
}
