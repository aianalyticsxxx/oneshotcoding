'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { useCamera } from '@/hooks/useCamera';
import { api, uploadFile } from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface ReactionCaptureModalProps {
  vibeId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReactionCaptureModal({
  vibeId,
  onClose,
  onSuccess,
}: ReactionCaptureModalProps) {
  const { theme } = useTheme();
  const isNeumorphic = theme === 'neumorphic';
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { stream, isLoading, hasPermission, error: cameraError, retryPermission } = useCamera(videoRef, 'user');

  const isReady = !isLoading && hasPermission && !!stream;

  const captureAndUpload = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    setIsCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Set canvas size to be square
      canvas.width = 256;
      canvas.height = 256;

      // Draw video frame (centered and cropped to square)
      const videoAspect = video.videoWidth / video.videoHeight;
      let sx = 0,
        sy = 0,
        sWidth = video.videoWidth,
        sHeight = video.videoHeight;

      if (videoAspect > 1) {
        // Video is wider - crop sides
        sWidth = video.videoHeight;
        sx = (video.videoWidth - sWidth) / 2;
      } else {
        // Video is taller - crop top/bottom
        sHeight = video.videoWidth;
        sy = (video.videoHeight - sHeight) / 2;
      }

      // Mirror the image for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 256, 256);

      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Failed to capture image');
      }

      setIsUploading(true);

      // Upload to S3
      const file = new File([blob], 'reaction.jpg', { type: 'image/jpeg' });
      const uploadResponse = await uploadFile<{ url: string; key: string }>(
        '/upload',
        file
      );

      if (uploadResponse.error || !uploadResponse.data) {
        throw new Error(uploadResponse.error?.message || 'Upload failed');
      }

      // Add photo reaction
      const reactionResponse = await api.addPhotoReaction(
        vibeId,
        uploadResponse.data.url,
        uploadResponse.data.key
      );

      if (reactionResponse.error) {
        throw new Error(reactionResponse.error.message);
      }

      // Success!
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture reaction');
    } finally {
      setIsCapturing(false);
      setIsUploading(false);
    }
  }, [vibeId, isReady, onSuccess]);

  const handleClose = () => {
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full max-w-sm rounded-2xl overflow-hidden',
          isNeumorphic
            ? 'bg-neumorphic-bg shadow-neu'
            : 'bg-glass-card backdrop-blur-xl border border-white/10'
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <h3
            className={cn(
              'font-semibold',
              isNeumorphic ? 'text-neumorphic-text' : 'text-white'
            )}
          >
            React with a Selfie
          </h3>
          <button
            onClick={handleClose}
            className={cn(
              'p-2 rounded-full transition-colors',
              isNeumorphic
                ? 'text-neumorphic-text-secondary hover:text-neumorphic-text'
                : 'text-white/50 hover:text-white'
            )}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Camera view */}
        <div className="relative aspect-square bg-black">
          {cameraError ? (
            <div className="absolute inset-0 flex items-center justify-center text-center p-4">
              <p className="text-red-400">{cameraError}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Circular mask overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <mask id="circleMask">
                      <rect width="100%" height="100%" fill="white" />
                      <circle cx="50%" cy="50%" r="40%" fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.5)"
                    mask="url(#circleMask)"
                  />
                </svg>
              </div>

              {/* Circular guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[80%] rounded-full border-2 border-white/30 border-dashed" />
              </div>
            </>
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="p-4 flex justify-center">
          <Button
            variant="gradient"
            size="lg"
            onClick={captureAndUpload}
            disabled={!isReady || isCapturing || isUploading}
            isLoading={isCapturing || isUploading}
            className="w-full max-w-[200px]"
          >
            {isUploading ? 'Sending...' : isCapturing ? 'Capturing...' : 'Capture'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
