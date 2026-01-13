'use client';

import { cn } from '@/lib/utils';
import { forwardRef, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme, type Theme } from '@/hooks/useTheme';

export interface ButtonProps {
  variant?: 'gradient' | 'glass' | 'ghost' | 'terminal';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  forceTheme?: Theme;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  form?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'gradient',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      forceTheme,
      children,
      disabled,
      type = 'button',
      onClick,
      form,
    },
    ref
  ) => {
    const { theme } = useTheme();
    const effectiveTheme = forceTheme || theme;

    const glassVariants = {
      gradient:
        'bg-gradient-vibe text-white shadow-terminal hover:shadow-glow hover:brightness-110',
      glass:
        'bg-terminal-bg-elevated text-terminal-text border border-terminal-border shadow-terminal-sm hover:border-terminal-border-bright',
      ghost:
        'bg-transparent text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-elevated',
      terminal:
        'bg-terminal-accent text-white font-mono shadow-terminal hover:brightness-110',
    };

    const neuVariants = {
      gradient:
        'bg-gradient-vibe text-white shadow-terminal hover:shadow-glow hover:brightness-110',
      glass:
        'bg-terminal-bg-elevated text-terminal-text border border-terminal-border shadow-terminal-sm hover:border-terminal-border-bright',
      ghost:
        'bg-transparent text-terminal-text-secondary hover:text-terminal-text hover:bg-terminal-bg-elevated',
      terminal:
        'bg-terminal-accent text-white font-mono shadow-terminal hover:brightness-110',
    };

    const sizes = {
      sm: 'py-2 px-4 text-sm rounded-md',
      md: 'py-2.5 px-5 text-base rounded-md',
      lg: 'py-3 px-6 text-lg rounded-lg',
    };

    const isNeumorphic = effectiveTheme === 'neumorphic';
    const currentVariants = isNeumorphic ? neuVariants : glassVariants;

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        className={cn(
          'font-medium transition-all duration-150 ease-out',
          'inline-flex items-center justify-center gap-2',
          'focus:outline-none focus:ring-2 focus:ring-terminal-accent/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          currentVariants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        type={type}
        onClick={onClick}
        form={form}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
