'use client';

import { getGitHubOAuthUrl, getTwitterOAuthUrl } from '@/lib/auth';

export function ScreenContent() {
  const handleGitHubLogin = () => {
    window.location.href = getGitHubOAuthUrl();
  };

  const handleXLogin = () => {
    window.location.href = getTwitterOAuthUrl();
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #171717 0%, #0D0D0D 100%)',
        fontFamily: '"JetBrains Mono", "SF Mono", "Fira Code", monospace',
        color: '#F5F5F5',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Dot matrix pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '16px 16px',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      {/* Subtle vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />

      {/* Concentric Circles Logo */}
      <div
        style={{
          marginBottom: '8px',
        }}
      >
        <svg width="56" height="56" viewBox="0 0 100 100" fill="none" style={{ filter: 'drop-shadow(0 0 12px rgba(217,119,6,0.5))' }}>
          <circle cx="50" cy="50" r="42" stroke="#D97706" strokeWidth="8" />
          <circle cx="50" cy="50" r="22" stroke="#D97706" strokeWidth="8" />
          <circle cx="50" cy="50" r="8" fill="#D97706" />
        </svg>
      </div>

      {/* Command line style title */}
      <div
        style={{
          fontSize: '11px',
          color: '#737373',
          margin: '0 0 6px 0',
          letterSpacing: '1px',
        }}
      >
        $ welcome to
      </div>

      {/* Title */}
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 700,
          margin: '0 0 4px 0',
          letterSpacing: '-0.5px',
          color: '#F5F5F5',
        }}
      >
        oneshotcoding
      </h1>

      {/* Tagline */}
      <p
        style={{
          fontSize: '12px',
          color: '#737373',
          margin: '0 0 24px 0',
          letterSpacing: '1px',
        }}
      >
        ship your daily build
      </p>

      {/* GitHub Login Button */}
      <button
        onClick={handleGitHubLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '280px',
          padding: '14px 24px',
          background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 15px rgba(217,119,6,0.3)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(217,119,6,0.4)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(217,119,6,0.3)';
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
          />
        </svg>
        Continue with GitHub
      </button>

      {/* Divider */}
      <div
        style={{
          fontSize: '11px',
          color: '#737373',
          margin: '12px 0',
        }}
      >
        or
      </div>

      {/* X Login Button */}
      <button
        onClick={handleXLogin}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '280px',
          padding: '14px 24px',
          background: '#000000',
          color: '#ffffff',
          border: '1px solid #404040',
          borderRadius: '8px',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
          e.currentTarget.style.background = '#1a1a1a';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.background = '#000000';
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Continue with X
      </button>

      {/* Community tagline */}
      <div
        style={{
          marginTop: '20px',
          fontSize: '10px',
          color: '#737373',
          letterSpacing: '1px',
        }}
      >
        join the dev community
      </div>

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '9px',
          color: 'rgba(255,255,255,0.2)',
          margin: 0,
        }}
      >
        By continuing, you agree to our{' '}
        <a
          href="/terms"
          style={{ color: 'rgba(217,119,6,0.6)', textDecoration: 'underline' }}
          onClick={(e) => { e.preventDefault(); window.open('/terms', '_blank'); }}
        >
          Terms
        </a>
        {' & '}
        <a
          href="/privacy"
          style={{ color: 'rgba(217,119,6,0.6)', textDecoration: 'underline' }}
          onClick={(e) => { e.preventDefault(); window.open('/privacy', '_blank'); }}
        >
          Privacy
        </a>
      </div>

      {/* Accent glow effects - warm orange */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-30%',
          width: '60%',
          height: '100%',
          background: 'radial-gradient(ellipse, rgba(217,119,6,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50%',
          right: '-30%',
          width: '60%',
          height: '100%',
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
