/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Only needed for Docker, not for Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.dicebear.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.railway.app',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
    ],
  },
  async rewrites() {
    // Use Railway API for production, localhost for development
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://vibecodeenergy-production.up.railway.app'
        : 'http://localhost:4000');
    return [
      {
        // Proxy all API routes except auth/me (handled by Next.js route)
        source: '/api/:path((?!auth/me).*)',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
