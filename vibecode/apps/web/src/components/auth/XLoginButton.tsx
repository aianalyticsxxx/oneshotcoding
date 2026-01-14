'use client';

import { getTwitterOAuthUrl } from '@/lib/auth';
import { motion } from 'framer-motion';

export interface XLoginButtonProps {
  className?: string;
  link?: boolean;
}

export function XLoginButton({ className, link }: XLoginButtonProps) {
  const handleLogin = () => {
    window.location.href = getTwitterOAuthUrl(link);
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleLogin}
      className={`
        w-full flex items-center justify-center gap-3
        bg-black text-white font-bold
        py-4 px-6 rounded-full
        border border-gray-700
        transition-colors duration-200
        hover:bg-gray-900
        ${className}
      `}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Continue with X
    </motion.button>
  );
}
