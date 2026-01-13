'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export interface VideoPreviewProps {
  videoUrl: string;
  onPost: (prompt: string, caption: string) => void;
  onRetake: () => void;
  isPosting: boolean;
}

export function VideoPreview({
  videoUrl,
  onPost,
  onRetake,
  isPosting,
}: VideoPreviewProps) {
  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');

  const handlePost = () => {
    if (!prompt.trim()) return;
    onPost(prompt, caption);
  };

  return (
    <div className="space-y-4">
      {/* Video preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-lg overflow-hidden bg-terminal-bg border border-terminal-border"
      >
        <video
          src={videoUrl}
          controls
          className="w-full aspect-video object-contain bg-terminal-bg"
        />
        {/* Video label */}
        <div className="absolute top-3 left-3">
          <span className="bg-terminal-success/90 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white font-mono">
            &gt; video output
          </span>
        </div>
      </motion.div>

      {/* Prompt input (required for videos) */}
      <GlassPanel padding="none">
        <div className="p-4 border-b border-glass-border">
          <label className="block text-sm font-mono text-terminal-accent mb-2">
            $ prompt <span className="text-terminal-error">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What was your prompt? (required)"
            maxLength={500}
            rows={2}
            className="w-full bg-terminal-bg-elevated border border-terminal-border rounded-lg resize-none p-3 text-terminal-text placeholder-terminal-text-dim font-mono text-sm focus:outline-none focus:border-terminal-accent"
          />
          <div className="text-right mt-1">
            <span className="text-terminal-text-dim text-xs font-mono">{prompt.length}/500</span>
          </div>
        </div>
      </GlassPanel>

      {/* Caption input (optional) */}
      <GlassPanel padding="none">
        <div className="p-4">
          <label className="block text-sm font-mono text-terminal-text-secondary mb-2">
            $ caption <span className="text-terminal-text-dim">(optional)</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption..."
            maxLength={280}
            rows={2}
            className="w-full bg-terminal-bg-elevated border border-terminal-border rounded-lg resize-none p-3 text-terminal-text placeholder-terminal-text-dim font-mono text-sm focus:outline-none focus:border-terminal-accent"
          />
          <div className="text-right mt-1">
            <span className="text-terminal-text-dim text-xs font-mono">{caption.length}/280</span>
          </div>
        </div>
      </GlassPanel>

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
            './share-video'
          )}
        </Button>
      </div>
    </div>
  );
}
