'use client';

import { useRef, useCallback, useState, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { useCamera } from '@/hooks/useCamera';

export interface DualCaptureResult {
  selfie: Blob;
  screenshot: Blob;
}

export interface DualCaptureProps {
  onCapture: (result: DualCaptureResult) => void;
  className?: string;
}

type CaptureStep = 'screenshot' | 'selfie' | 'complete';

export function DualCapture({ onCapture, className }: DualCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<CaptureStep>('screenshot');
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const [selfie, setSelfie] = useState<Blob | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [screenshotError, setScreenshotError] = useState<string | null>(null);

  const { isLoading, error: cameraError, hasPermission, retryPermission } = useCamera(
    videoRef,
    facingMode
  );

  // Capture screenshot using Screen Capture API
  const captureScreen = useCallback(async () => {
    try {
      setScreenshotError(null);

      // Request screen capture permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      // Create video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait a moment for video to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            setScreenshot(blob);
            setStep('selfie');
          }
        }, 'image/jpeg', 0.9);
      }
    } catch (err) {
      console.error('Screenshot error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setScreenshotError('Screen sharing was denied. Please allow screen capture or upload a screenshot.');
        } else {
          setScreenshotError('Failed to capture screen. Please try again or upload a screenshot.');
        }
      }
    }
  }, []);

  // Handle screenshot file upload as fallback
  const handleScreenshotUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setScreenshot(file);
      setStep('selfie');
      setScreenshotError(null);
    }
    if (screenshotInputRef.current) {
      screenshotInputRef.current.value = '';
    }
  }, []);

  // Capture selfie from camera
  const captureSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    setIsCapturing(true);
    setTimeout(() => setIsCapturing(false), 200);

    canvas.toBlob((blob) => {
      if (blob && screenshot) {
        setSelfie(blob);
        onCapture({ selfie: blob, screenshot });
      }
    }, 'image/jpeg', 0.9);
  }, [facingMode, screenshot, onCapture]);

  // Handle selfie file upload as fallback
  const handleSelfieUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/') && screenshot) {
      setSelfie(file);
      onCapture({ selfie: file, screenshot });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [screenshot, onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Step 1: Screenshot capture
  if (step === 'screenshot') {
    return (
      <div className={cn('space-y-4', className)}>
        <GlassPanel className="p-6 text-center">
          <div className="text-4xl mb-4">🖥️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Step 1: Capture Your Screen</h3>
          <p className="text-white/60 mb-6">
            Show what you're working on! Share your code, terminal, or IDE.
          </p>

          {screenshotError && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-200 text-sm">{screenshotError}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button onClick={captureScreen} variant="gradient">
              Share Screen
            </Button>
            <p className="text-white/40 text-sm">or</p>
            <Button
              onClick={() => screenshotInputRef.current?.click()}
              variant="glass"
            >
              Upload Screenshot
            </Button>
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              onChange={handleScreenshotUpload}
              className="hidden"
            />
          </div>
        </GlassPanel>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-vibe-purple" />
          <div className="w-3 h-3 rounded-full bg-white/20" />
        </div>
      </div>
    );
  }

  // Step 2: Selfie capture
  if (step === 'selfie') {
    // Show camera error state
    if (cameraError || !hasPermission) {
      return (
        <div className={cn('space-y-4', className)}>
          {/* Screenshot preview */}
          {screenshot && (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black/50">
              <img
                src={URL.createObjectURL(screenshot)}
                alt="Screenshot"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                Screenshot captured
              </div>
            </div>
          )}

          <GlassPanel className="p-6 text-center">
            <div className="text-4xl mb-4">📷</div>
            <h3 className="text-xl font-semibold text-white mb-2">Step 2: Take a Selfie</h3>
            <p className="text-white/60 mb-6">
              {cameraError || 'Please allow camera access to take a selfie'}
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={retryPermission} variant="gradient">
                Try Again
              </Button>
              <p className="text-white/40 text-sm">or</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="glass"
              >
                Upload Selfie
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSelfieUpload}
                className="hidden"
              />
            </div>
          </GlassPanel>

          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 rounded-full bg-vibe-purple/50" />
            <div className="w-3 h-3 rounded-full bg-vibe-purple" />
          </div>
        </div>
      );
    }

    return (
      <div className={cn('space-y-4', className)}>
        {/* Screenshot preview (small) */}
        {screenshot && (
          <div className="relative h-20 rounded-lg overflow-hidden bg-black/50">
            <img
              src={URL.createObjectURL(screenshot)}
              alt="Screenshot"
              className="w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/50 px-2 py-1 rounded text-xs text-white">
                Screenshot ready
              </span>
            </div>
          </div>
        )}

        {/* Selfie camera */}
        <div className="relative">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <div className="w-8 h-8 border-2 border-vibe-purple border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                'w-full h-full object-cover',
                facingMode === 'user' && 'scale-x-[-1]'
              )}
            />

            {/* Capture flash effect */}
            <AnimatePresence>
              {isCapturing && (
                <motion.div
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </AnimatePresence>

            {/* Corner guides */}
            <div className="absolute inset-4 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
            </div>

            {/* Step indicator overlay */}
            <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
              Step 2: Selfie
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mt-6">
            {/* Flip camera button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </motion.button>

            {/* Capture button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={captureSelfie}
              className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-glow"
            >
              <motion.div className="w-16 h-16 rounded-full bg-gradient-vibe" whileHover={{ scale: 1.05 }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">📸</span>
              </div>
            </motion.button>

            {/* Upload fallback */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleSelfieUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2">
          <div className="w-3 h-3 rounded-full bg-vibe-purple/50" />
          <div className="w-3 h-3 rounded-full bg-vibe-purple" />
        </div>
      </div>
    );
  }

  return null;
}
