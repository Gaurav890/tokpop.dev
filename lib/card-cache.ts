export type CardTheme = 'dark' | 'light';

export const CARD_RESPONSE_HEADERS = {
  'content-type': 'image/svg+xml; charset=utf-8',
  'cache-control': 'public, max-age=0, must-revalidate',
  'cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=30',
  'vercel-cdn-cache-control': 'public, s-maxage=60, stale-while-revalidate=30',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
} as const;

export function stableCardPath(username: string, theme: CardTheme): string {
  return `/api/v1/cards/${username}?theme=${theme}`;
}

export function previewCardPath(username: string, theme: CardTheme, updatedAt: string): string {
  return `${stableCardPath(username, theme)}&v=${encodeURIComponent(updatedAt)}`;
}

export function cardFunnelPath(username: string): string {
  return `/make/${encodeURIComponent(username)}`;
}
