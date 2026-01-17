'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      router.push('/');
    }
  }, [user, isLoading, isAdmin, router]);

  const handleGoToMainApp = () => {
    window.location.href = 'https://oneshotcoding.io';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-bg">
        <div className="w-8 h-8 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg p-4">
      <div className="w-full max-w-md">
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-admin-accent flex items-center justify-center">
              <span className="text-white font-bold text-2xl">OS</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-admin-text text-center mb-2">
            Admin Panel
          </h1>
          <p className="text-admin-text-secondary text-center mb-8">
            This panel is restricted to authorized administrators only.
          </p>

          {/* Access Denied Message */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm text-center">
              {user
                ? "Your account does not have admin access."
                : "Please log in to the main app first, then return here."}
            </p>
          </div>

          {/* Go to Main App Button */}
          <button
            onClick={handleGoToMainApp}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-admin-accent text-white rounded-lg font-medium hover:bg-admin-accent-hover transition-colors"
          >
            Go to oneshotcoding
          </button>
        </div>
      </div>
    </div>
  );
}
