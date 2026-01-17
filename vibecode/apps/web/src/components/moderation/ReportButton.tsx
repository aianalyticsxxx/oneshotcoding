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
          'py-1.5 px-2 rounded-md transition-colors',
          'text-terminal-text-dim hover:text-red-400',
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
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
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
