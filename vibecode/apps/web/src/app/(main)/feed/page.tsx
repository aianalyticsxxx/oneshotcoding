'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function FeedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/feed/explore');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-mono text-terminal-text-secondary flex items-center gap-2">
        <span className="text-terminal-accent">$</span>
        <span>redirecting...</span>
        <span className="w-2 h-4 bg-terminal-accent animate-cursor-blink" />
      </div>
    </div>
  );
}
