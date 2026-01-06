'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DualCapture, DualCaptureResult } from '@/components/capture/DualCapture';
import { DualPhotoPreview } from '@/components/capture/DualPhotoPreview';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useDailyVibe } from '@/hooks/useDailyVibe';
import { useVibes } from '@/hooks/useVibes';
import { api } from '@/lib/api';

// Cross-browser rounded rectangle helper (ctx.roundRect is not supported in all browsers)
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
  ctx.lineTo(x + radius, y + height);
  ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + radius);
  ctx.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
  ctx.closePath();
}

export default function CapturePage() {
  const router = useRouter();
  const [capturedPhotos, setCapturedPhotos] = useState<DualCaptureResult | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { hasPostedToday, todaysVibe, markAsPosted } = useDailyVibe();
  const { addVibe } = useVibes();

  const handleCapture = useCallback((result: DualCaptureResult) => {
    setCapturedPhotos(result);
    setError(null);
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedPhotos(null);
    setError(null);
  }, []);

  const handlePost = useCallback(
    async (caption: string) => {
      if (!capturedPhotos) return;

      setIsPosting(true);
      setError(null);

      try {
        // Combine issue code (small overlay) and fix code (large background) into a single image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Load both images
        const fixCodeImg = new Image();    // Large background - the fix
        const issueCodeImg = new Image();  // Small overlay - the issue/bug

        const fixCodeUrl = URL.createObjectURL(capturedPhotos.fixCode);
        const issueCodeUrl = URL.createObjectURL(capturedPhotos.issueCode);

        await Promise.all([
          new Promise<void>((resolve, reject) => {
            fixCodeImg.onload = () => {
              console.log('Fix code loaded:', fixCodeImg.width, 'x', fixCodeImg.height);
              resolve();
            };
            fixCodeImg.onerror = (e) => {
              console.error('Fix code load error:', e);
              reject(e);
            };
            fixCodeImg.src = fixCodeUrl;
          }),
          new Promise<void>((resolve, reject) => {
            issueCodeImg.onload = () => {
              console.log('Issue code loaded:', issueCodeImg.width, 'x', issueCodeImg.height);
              resolve();
            };
            issueCodeImg.onerror = (e) => {
              console.error('Issue code load error:', e);
              reject(e);
            };
            issueCodeImg.src = issueCodeUrl;
          }),
        ]);

        console.log('Both images loaded, creating composite...');

        // Validate images have actual dimensions
        if (issueCodeImg.width === 0 || issueCodeImg.height === 0) {
          throw new Error('Issue code screenshot has zero dimensions');
        }
        if (fixCodeImg.width === 0 || fixCodeImg.height === 0) {
          throw new Error('Fix code screenshot has zero dimensions');
        }

        // Set canvas size to fix code dimensions (or max 1920px)
        const maxWidth = 1920;
        const scale = Math.min(1, maxWidth / fixCodeImg.width);
        canvas.width = fixCodeImg.width * scale;
        canvas.height = fixCodeImg.height * scale;

        // Draw fix code as background (the larger image showing the solution)
        ctx.drawImage(fixCodeImg, 0, 0, canvas.width, canvas.height);

        // Draw issue code in top-left corner (smaller overlay showing the bug)
        // Issue is smaller (25%), Fix is the main focus
        const overlaySize = Math.min(canvas.width, canvas.height) * 0.25; // 25% - smaller for the issue
        const overlayMargin = 20;
        const overlayX = overlayMargin;
        const overlayY = overlayMargin;
        const radius = 12;

        console.log('Drawing issue overlay:', {
          overlaySize,
          overlayX,
          overlayY,
          issueImgWidth: issueCodeImg.width,
          issueImgHeight: issueCodeImg.height,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Draw shadow behind issue overlay
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = 'black';
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.fill();
        ctx.restore();

        // Draw issue code with rounded corners
        ctx.save();
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.clip();

        // Calculate crop to fit square (center crop)
        const issueAspect = issueCodeImg.width / issueCodeImg.height;
        let sx = 0, sy = 0, sw = issueCodeImg.width, sh = issueCodeImg.height;
        if (issueAspect > 1) {
          sw = issueCodeImg.height;
          sx = (issueCodeImg.width - sw) / 2;
        } else {
          sh = issueCodeImg.width;
          sy = (issueCodeImg.height - sh) / 2;
        }

        ctx.drawImage(issueCodeImg, sx, sy, sw, sh, overlayX, overlayY, overlaySize, overlaySize);
        console.log('Issue code drawn to canvas at', overlayX, overlayY, 'size', overlaySize);
        ctx.restore();

        // Add red border around issue (to indicate it's the bug)
        ctx.strokeStyle = '#ef4444'; // red-500
        ctx.lineWidth = 4;
        drawRoundedRect(ctx, overlayX, overlayY, overlaySize, overlaySize, radius);
        ctx.stroke();

        // Add small "BUG" label
        ctx.save();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px system-ui, sans-serif';
        const labelWidth = ctx.measureText('🐛 BUG').width + 12;
        const labelHeight = 22;
        const labelX = overlayX;
        const labelY = overlayY + overlaySize + 6;

        // Label background
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        drawRoundedRect(ctx, labelX, labelY, labelWidth, labelHeight, 6);
        ctx.fill();

        // Label text
        ctx.fillStyle = 'white';
        ctx.fillText('🐛 BUG', labelX + 6, labelY + 16);
        ctx.restore();

        // Clean up URLs
        URL.revokeObjectURL(fixCodeUrl);
        URL.revokeObjectURL(issueCodeUrl);

        console.log('Canvas composite created:', canvas.width, 'x', canvas.height);

        // Convert canvas to blob
        const combinedBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('Combined blob created, size:', blob.size);
              resolve(blob);
            } else {
              reject(new Error('Failed to create image'));
            }
          }, 'image/jpeg', 0.9);
        });

        const file = new File([combinedBlob], 'vibe.jpg', {
          type: 'image/jpeg',
        });
        console.log('File created for upload:', file.name, file.size);

        const { data, error: apiError } = await api.createVibe(file, caption);

        if (apiError) {
          setError(apiError.message);
          return;
        }

        if (data) {
          // Optimistically update state
          markAsPosted(data);
          addVibe(data);

          // Redirect to feed
          router.push('/feed');
        }
      } catch (err) {
        console.error('Failed to post vibe:', err);
        setError('Failed to share your vibe. Please try again.');
      } finally {
        setIsPosting(false);
      }
    },
    [capturedPhotos, markAsPosted, addVibe, router]
  );

  // If user has already posted today, show their vibe
  if (hasPostedToday && todaysVibe) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassPanel className="text-center" padding="lg">
            <div className="text-5xl mb-4">✨</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Vibe shared!
            </h1>
            <p className="text-white/60 mb-6">
              You&apos;ve already shared your vibe today. Come back tomorrow!
            </p>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/feed')}
              className="text-vibe-purple hover:text-vibe-purple-light transition-colors font-medium"
            >
              View your feed
            </motion.button>
          </GlassPanel>
        </motion.div>

        {/* Show today's vibe preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-white/50 text-sm text-center mb-3">
            Today&apos;s vibe
          </p>
          <GlassPanel padding="none" className="overflow-hidden">
            <div className="aspect-video relative">
              <img
                src={todaysVibe.imageUrl}
                alt="Today's vibe"
                className="w-full h-full object-contain bg-black"
              />
            </div>
            {todaysVibe.caption && (
              <div className="p-4">
                <p className="text-white/90">{todaysVibe.caption}</p>
              </div>
            )}
          </GlassPanel>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Share your fix
        </h1>
        <p className="text-white/60">
          {capturedPhotos
            ? 'Nice fix! Add a caption or retake.'
            : 'Capture bug → then the fix'}
        </p>
      </motion.div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassPanel className="bg-red-500/20 border-red-500/30 text-center">
              <p className="text-red-200">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dual Capture or Preview */}
      <AnimatePresence mode="wait">
        {capturedPhotos ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <DualPhotoPreview
              photos={capturedPhotos}
              onPost={handlePost}
              onRetake={handleRetake}
              isPosting={isPosting}
            />
          </motion.div>
        ) : (
          <motion.div
            key="capture"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <DualCapture onCapture={handleCapture} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {!capturedPhotos && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <p className="text-white/40 text-sm">
            Show the bug 🐛 → then your fix ✨
          </p>
        </motion.div>
      )}
    </div>
  );
}
