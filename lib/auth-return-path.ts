export function authReturnPath(value: string | null | undefined, origin: string): string {
  const fallback = '/dashboard';
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20\x7f]/.test(value)) return fallback;
  const pathname = value.split(/[?#]/, 1)[0];
  // Reject encoded separators, controls, and nested encodings before URL normalization.
  if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|20|25|7f)/i.test(pathname)) return fallback;
  try {
    const base = new URL(origin);
    const target = new URL(value, base);
    if (target.origin !== base.origin || target.pathname.startsWith('//')) return fallback;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
