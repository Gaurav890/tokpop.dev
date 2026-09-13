import 'server-only';

import { cookies } from 'next/headers';
import { sessionCookieName } from './auth';

export class BackendRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BackendRequestError';
  }
}

export function backendOrigin(): string | null {
  return process.env.BACKEND_URL?.replace(/\/$/, '') ?? null;
}

export async function backendResponse(
  path: string,
  options: { authenticated?: boolean; init?: RequestInit } = {},
): Promise<Response> {
  const origin = backendOrigin();
  if (!origin) throw new Error('BACKEND_URL is not configured.');

  const headers = new Headers(options.init?.headers);
  headers.set('accept', 'application/json');
  if (options.authenticated) {
    const session = (await cookies()).get(sessionCookieName)?.value;
    if (session) headers.set('cookie', `${sessionCookieName}=${session}`);
  }

  return fetch(`${origin}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options.init,
    headers,
    cache: 'no-store',
  });
}

export async function backendJson<T>(
  path: string,
  options: { authenticated?: boolean; init?: RequestInit } = {},
): Promise<T> {
  const response = await backendResponse(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new BackendRequestError(response.status, body.error ?? `Backend request failed with ${response.status}.`);
  }
  return response.json() as Promise<T>;
}
