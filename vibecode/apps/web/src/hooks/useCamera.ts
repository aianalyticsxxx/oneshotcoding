'use client';

import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseCameraReturn {
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  isReady: boolean;
  stream: MediaStream | null;
  retryPermission: () => void;
  restartCamera: () => void;
}

export function useCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  facingMode: 'user' | 'environment' = 'user'
): UseCameraReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsReady(false);

    try {
      // Stop any existing stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for video to actually start playing
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not found'));
            return;
          }

          const onPlaying = () => {
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
            resolve();
          };

          const onError = () => {
            video.removeEventListener('playing', onPlaying);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to play'));
          };

          video.addEventListener('playing', onPlaying);
          video.addEventListener('error', onError);

          video.play().catch(reject);
        });

        setIsReady(true);
      }

      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          // Check if it's a system-level denial vs browser-level
          const errorMessage = err.message?.toLowerCase() || '';
          if (errorMessage.includes('system') || errorMessage.includes('permission denied by system')) {
            setError('Camera blocked by your system. On Mac: System Settings → Privacy & Security → Camera → Enable your browser.');
          } else {
            setError('Camera permission was denied. Please allow camera access in your browser settings.');
          }
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setError('Camera is in use by another application. Please close other apps using the camera.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Camera does not support the requested settings.');
        } else {
          setError('Unable to access camera. Please try again.');
        }
      } else {
        setError('An unexpected error occurred.');
      }

      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream, videoRef]);

  const retryPermission = useCallback(() => {
    startCamera();
  }, [startCamera]);

  // Restart camera (useful after screen capture disrupts the stream)
  const restartCamera = useCallback(() => {
    startCamera();
  }, [startCamera]);

  // Start camera on mount and when facing mode changes
  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Handle visibility change (pause/resume when tab is hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause video when tab is hidden
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // Resume video when tab is visible
        if (videoRef.current && stream) {
          videoRef.current.play().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [stream, videoRef]);

  return {
    isLoading,
    error,
    hasPermission,
    isReady,
    stream,
    retryPermission,
    restartCamera,
  };
}
