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

type CaptureMode = 'ready' | 'capturing' | 'complete';

export function DualCapture({ onCapture, className }: DualCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<CaptureMode>('ready');
  const [isCapturing, setIsCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  const { isLoading, error: cameraError, hasPermission, isReady, retryPermission } = useCamera(
    videoRef,
    facingMode
  );

  // Capture selfie from current camera feed
  const captureSelfieFromVideo = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Flip horizontally if using front camera
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.9);
    });
  }, [facingMode]);

  // Capture screenshot using Screen Capture API
  const captureScreenshot = useCallback((): Promise<Blob | null> => {
    return new Promise(async (resolve) => {
      try {
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
        await new Promise(r => setTimeout(r, 100));

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
            resolve(blob);
          }, 'image/jpeg', 0.9);
        } else {
          stream.getTracks().forEach(track => track.stop());
          resolve(null);
        }
      } catch (err) {
        console.error('Screenshot error:', err);
        resolve(null);
      }
    });
  }, []);

  // Simultaneous capture: screen + selfie at the same time
  const captureSimultaneous = useCallback(async () => {
    setError(null);
    setMode('capturing');
    setIsCapturing(true);

    try {
      // Start screen capture first (requires user interaction for permission)
      const screenshotPromise = captureScreenshot();

      // Small delay then capture selfie while screen share dialog is open
      // The selfie is captured right when user confirms screen share
      const screenshot = await screenshotPromise;

      if (!screenshot) {
        setError('Screen sharing was denied. Please allow screen capture or try manual upload.');
        setMode('ready');
        setIsCapturing(false);
        return;
      }

      // Capture selfie immediately after screenshot
      const selfie = await captureSelfieFromVideo();

      if (!selfie) {
        setError('Failed to capture selfie. Please try again.');
        setMode('ready');
        setIsCapturing(false);
        return;
      }

      // Flash effect
      setTimeout(() => setIsCapturing(false), 200);

      // Success! Call onCapture with both
      onCapture({ selfie, screenshot });
      setMode('complete');
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture. Please try again.');
      setMode('ready');
      setIsCapturing(false);
    }
  }, [captureScreenshot, captureSelfieFromVideo, onCapture]);

  // Handle manual file uploads as fallback
  const handleManualUpload = useCallback((e: ChangeEvent<HTMLInputElement>, type: 'selfie' | 'screenshot') => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    // Store in a ref or state for the other upload
    if (type === 'selfie') {
      // Store selfie, wait for screenshot
      fileInputRef.current?.setAttribute('data-blob', URL.createObjectURL(file));
    }

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  }, []);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Camera error state - show upload fallback
  if (cameraError || !hasPermission) {
    return (
      <div className={cn('space-y-4', className)}>
        <GlassPanel className="p-6 text-center">
          <div className="text-4xl mb-4">📷</div>
          <h3 className="text-xl font-semibold text-white mb-2">Camera Access Needed</h3>
          <p className="text-white/60 mb-6">
            {cameraError || 'Please allow camera access for the BeReal experience'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={retryPermission} variant="gradient">
              Try Again
            </Button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Live camera preview with overlay showing what will be captured */}
      <div className="relative">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black">
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
                transition={{ duration: 0.3 }}
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

          {/* Status overlay */}
          <div className="absolute top-2 left-2 bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-2">
            {isReady ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-white">Camera Ready</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs text-white">Starting camera...</span>
              </>
            )}
          </div>

          {/* Screen capture preview indicator */}
          <div className="absolute bottom-2 right-2 bg-black/50 px-3 py-1.5 rounded-full">
            <span className="text-xs text-white/80">+ Screen Capture</span>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 bg-red-500/20 border border-red-500/30 rounded-lg p-3"
          >
            <p className="text-red-200 text-sm text-center">{error}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {/* Flip camera button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleCamera}
            disabled={mode === 'capturing'}
            className="w-12 h-12 rounded-full bg-glass-white backdrop-blur-glass border border-glass-border flex items-center justify-center text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.button>

          {/* Main capture button - captures both simultaneously */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={captureSimultaneous}
            disabled={mode === 'capturing' || !isReady}
            className="relative w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-glow disabled:opacity-50"
          >
            {mode === 'capturing' ? (
              <div className="w-16 h-16 rounded-full bg-gradient-vibe flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <motion.div className="w-16 h-16 rounded-full bg-gradient-vibe" whileHover={{ scale: 1.05 }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">📸</span>
                </div>
              </>
            )}
          </motion.button>

          {/* Placeholder for symmetry */}
          <div className="w-12 h-12" />
        </div>

        {/* Instruction text */}
        <p className="text-center text-white/50 text-sm mt-4">
          Tap to capture your selfie + screen at once
        </p>
      </div>
    </div>
  );
}
