'use client';

export default function AccessDeniedPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-8">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-admin-error/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-admin-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-admin-text mb-2">
            Access Denied
          </h1>
          <p className="text-admin-text-secondary mb-8">
            You don&apos;t have permission to access the admin panel. Please
            contact an administrator if you believe this is an error.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = 'https://oneshotcoding.io'}
              className="w-full px-4 py-2.5 bg-admin-accent text-white rounded-lg font-medium hover:bg-admin-accent-hover transition-colors"
            >
              Go to oneshotcoding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
