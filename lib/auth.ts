import { cookies } from 'next/headers';
import { env } from 'cloudflare:workers';
import { hmac, secureEqual } from './crypto';

export type GitHubSession = { userId: string; login: string; name: string; avatarUrl: string; exp: number };
const COOKIE = 'anp_session';
const secret = () => env.SESSION_SECRET ?? process.env.SESSION_SECRET ?? null;

export async function signSession(session: GitHubSession): Promise<string> {
  const key = secret();
  if (!key) throw new Error('SESSION_SECRET is not configured.');
  const body = btoa(JSON.stringify(session)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${body}.${await hmac(body, key)}`;
}

export async function verifySession(value?: string): Promise<GitHubSession | null> {
  const key = secret();
  if (!key || !value) return null;
  const [body, signature] = value.split('.');
  if (!body || !signature || !(await secureEqual(await hmac(body, key), signature))) return null;
  try {
    const normalized = body.replace(/-/g, '+').replace(/_/g, '/');
    const session = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as GitHubSession;
    return session.exp > Date.now() / 1000 ? session : null;
  } catch { return null; }
}

export async function currentGitHubUser(): Promise<GitHubSession | null> {
  return verifySession((await cookies()).get(COOKIE)?.value);
}

export const sessionCookieName = COOKIE;
