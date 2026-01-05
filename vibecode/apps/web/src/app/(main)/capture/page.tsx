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
        // Combine screenshot and selfie into a single image
        // Create canvas to composite the images
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Failed to create canvas context');
        }

        // Load both images
        const screenshotImg = new Image();
        const selfieImg = new Image();

        const screenshotUrl = URL.createObjectURL(capturedPhotos.screenshot);
        const selfieUrl = URL.createObjectURL(capturedPhotos.selfie);

        await Promise.all([
          new Promise<void>((resolve, reject) => {
            screenshotImg.onload = () => {
              console.log('Screenshot loaded:', screenshotImg.width, 'x', screenshotImg.height);
              resolve();
            };
            screenshotImg.onerror = (e) => {
              console.error('Screenshot load error:', e);
              reject(e);
            };
            screenshotImg.src = screenshotUrl;
          }),
          new Promise<void>((resolve, reject) => {
            selfieImg.onload = () => {
              console.log('Selfie loaded:', selfieImg.width, 'x', selfieImg.height);
              resolve();
            };
            selfieImg.onerror = (e) => {
              console.error('Selfie load error:', e);
              reject(e);
            };
            selfieImg.src = selfieUrl;
          }),
        ]);

        console.log('Both images loaded, creating composite...');

        // Validate images have actual dimensions
        if (selfieImg.width === 0 || selfieImg.height === 0) {
          throw new Error('Selfie image has zero dimensions - camera may not have captured properly');
        }
        if (screenshotImg.width === 0 || screenshotImg.height === 0) {
          throw new Error('Screenshot has zero dimensions - screen capture may have failed');
        }

        // Set canvas size to screenshot dimensions (or max 1920px)
        const maxWidth = 1920;
        const scale = Math.min(1, maxWidth / screenshotImg.width);
        canvas.width = screenshotImg.width * scale;
        canvas.height = screenshotImg.height * scale;

        // Draw screenshot as background
        ctx.drawImage(screenshotImg, 0, 0, canvas.width, canvas.height);

        // Draw selfie in top-left corner (BeReal style) - make it bigger and more visible
        const selfieSize = Math.min(canvas.width, canvas.height) * 0.45; // 45% of smaller dimension - larger!
        const selfieMargin = 32;
        const selfieX = selfieMargin;
        const selfieY = selfieMargin;
        const radius = 20;

        console.log('Drawing selfie overlay:', {
          selfieSize,
          selfieX,
          selfieY,
          selfieImgWidth: selfieImg.width,
          selfieImgHeight: selfieImg.height,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height
        });

        // Draw shadow behind selfie for visibility
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = 'black';
        drawRoundedRect(ctx, selfieX, selfieY, selfieSize, selfieSize, radius);
        ctx.fill();
        ctx.restore();

        // Draw selfie with rounded corners
        ctx.save();
        drawRoundedRect(ctx, selfieX, selfieY, selfieSize, selfieSize, radius);
        ctx.clip();

        // Calculate selfie crop (center crop to square)
        const selfieAspect = selfieImg.width / selfieImg.height;
        let sx = 0, sy = 0, sw = selfieImg.width, sh = selfieImg.height;
        if (selfieAspect > 1) {
          sw = selfieImg.height;
          sx = (selfieImg.width - sw) / 2;
        } else {
          sh = selfieImg.width;
          sy = (selfieImg.height - sh) / 2;
        }

        ctx.drawImage(selfieImg, sx, sy, sw, sh, selfieX, selfieY, selfieSize, selfieSize);
        console.log('Selfie drawn to canvas at', selfieX, selfieY, 'size', selfieSize);
        ctx.restore();

        // Add thick white border around selfie
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 8;
        drawRoundedRect(ctx, selfieX, selfieY, selfieSize, selfieSize, radius);
        ctx.stroke();

        // Clean up URLs
        URL.revokeObjectURL(screenshotUrl);
        URL.revokeObjectURL(selfieUrl);

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
          Share your vibe
        </h1>
        <p className="text-white/60">
          {capturedPhotos
            ? 'Looking good! Add a caption or retake.'
            : 'Capture your screen + selfie'}
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
            Show your code + your face, BeReal style!
          </p>
        </motion.div>
      )}
    </div>
  );
}
