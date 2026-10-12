import type { NextConfig } from 'next';
import { LEGACY_PUBLIC_ORIGIN, publicAppOrigin } from './lib/public-origin';

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');

const nextConfig: NextConfig = {
  async redirects() {
    if (!process.env.PUBLIC_APP_URL) return [];
    const origin = publicAppOrigin(process.env.PUBLIC_APP_URL);
    if (origin === LEGACY_PUBLIC_ORIGIN) return [];
    return [{
      source: '/api/auth/github/start',
      has: [{ type: 'host' as const, value: 'ai-native-profile.vercel.app' }],
      destination: `${origin}/api/auth/github/start`,
      permanent: false,
    }];
  },
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
