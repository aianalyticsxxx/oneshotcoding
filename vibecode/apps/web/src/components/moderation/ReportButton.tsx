'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ReportModal } from './ReportModal';

interface ReportButtonProps {
  targetType: 'user' | 'shot' | 'comment';
  targetId: string;
  targetName?: string;
  className?: string;
  variant?: 'icon' | 'text' | 'menu';
}

export function ReportButton({
  targetType,
  targetId,
  targetName,
  className,
  variant = 'icon',
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors',
            className
          )}
        >
          Report {targetType === 'user' ? 'User' : targetType === 'shot' ? 'Post' : 'Comment'}
        </button>
        <ReportModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
        />
      </>
    );
  }

  if (variant === 'text') {
    return (
      <>
        <button
          onClick={handleClick}
          className={cn(
            'text-sm text-terminal-text-dim hover:text-red-400 transition-colors',
            className
          )}
        >
          Report
        </button>
        <ReportModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
        />
      </>
    );
  }

  // Icon variant (default)
  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'text-terminal-text-dim hover:text-red-400 hover:bg-red-500/10',
          className
        )}
        title={`Report ${targetType}`}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
          />
        </svg>
      </button>
      <ReportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        targetType={targetType}
        targetId={targetId}
        targetName={targetName}
      />
    </>
  );
}
