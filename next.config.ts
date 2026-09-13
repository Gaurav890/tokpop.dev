import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
  async rewrites() {
    if (!backendUrl) return [];
    return {
      beforeFiles: [
        { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
        { source: '/mcp/:path*', destination: `${backendUrl}/mcp/:path*` },
        { source: '/oauth/token', destination: `${backendUrl}/oauth/token` },
        { source: '/oauth/register', destination: `${backendUrl}/oauth/register` },
        { source: '/oauth/authorize/decision', destination: `${backendUrl}/oauth/authorize/decision` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
