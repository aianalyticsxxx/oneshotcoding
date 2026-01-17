import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Admin panel palette
        admin: {
          bg: '#09090B',
          'bg-elevated': '#0f0f10',
          'bg-card': '#18181B',
          'bg-hover': '#27272A',
          border: '#27272A',
          'border-bright': '#3F3F46',
          text: '#FAFAFA',
          'text-secondary': '#A1A1AA',
          'text-dim': '#71717A',
          accent: '#F59E0B',
          'accent-hover': '#D97706',
          success: '#22C55E',
          error: '#EF4444',
          info: '#3B82F6',
          warning: '#F59E0B',
        },
        // oneshotcoding terminal palette
        terminal: {
          bg: '#0D0D0D',
          'bg-elevated': '#171717',
          'bg-card': '#1F1F1F',
          'bg-hover': '#262626',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-bright': 'rgba(255, 255, 255, 0.15)',
          text: '#F5F5F5',
          'text-secondary': '#A3A3A3',
          'text-dim': '#737373',
          accent: '#D97706',
          'accent-hover': '#B45309',
          'accent-soft': 'rgba(217, 119, 6, 0.2)',
          'accent-glow': 'rgba(217, 119, 6, 0.4)',
          success: '#22C55E',
          error: '#EF4444',
          info: '#3B82F6',
          warning: '#F59E0B',
        },
        // Legacy mappings for compatibility
        bereal: {
          black: '#0D0D0D',
          dark: '#171717',
          gray: '#1F1F1F',
          'gray-light': '#262626',
          'gray-lighter': '#333333',
          yellow: '#D97706',
          'yellow-dark': '#B45309',
          white: '#F5F5F5',
          'white-muted': '#A3A3A3',
          'white-dim': '#737373',
        },
        vibe: {
          purple: '#D97706',
          'purple-light': '#F59E0B',
          'purple-dark': '#B45309',
        },
        glass: {
          white: 'rgba(255, 255, 255, 0.06)',
          'white-light': 'rgba(255, 255, 255, 0.10)',
          'white-lighter': 'rgba(255, 255, 255, 0.14)',
          dark: 'rgba(0, 0, 0, 0.5)',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        neumorphic: {
          base: '#171717',
          light: '#1F1F1F',
          dark: '#0D0D0D',
          text: '#F5F5F5',
          'text-secondary': '#737373',
        },
      },
      backgroundImage: {
        'gradient-vibe': 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
        'gradient-vibe-soft': 'linear-gradient(135deg, rgba(217, 119, 6, 0.3) 0%, rgba(180, 83, 9, 0.3) 100%)',
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'terminal-gradient': 'linear-gradient(180deg, #171717 0%, #0D0D0D 100%)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-heavy': '20px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
        glow: '0 0 20px rgba(217, 119, 6, 0.4)',
        'glow-orange': '0 0 20px rgba(217, 119, 6, 0.5)',
        'terminal': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'terminal-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'sparkle': 'sparkle 0.6s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'cursor-blink': 'cursor-blink 1s step-end infinite',
        'typing': 'typing 2s steps(20, end)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'sparkle': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(217, 119, 6, 0.4)' },
          '50%': { boxShadow: '0 0 30px rgba(217, 119, 6, 0.6)' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'typing': {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
