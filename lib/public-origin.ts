export const LEGACY_PUBLIC_ORIGIN = 'https://ai-native-profile.vercel.app';

export function publicAppOrigin(configured?: string, fallback = LEGACY_PUBLIC_ORIGIN): string {
  const url = new URL(configured?.trim() || fallback);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PUBLIC_APP_URL must be an HTTPS origin without a path, query, or credentials (HTTP is allowed for localhost).');
  }
  return url.origin;
}
