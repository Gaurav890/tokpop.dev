import { env } from 'cloudflare:workers';
import { hmac, secureEqual } from './crypto';

type ClientRegistration = { redirect_uris: string[]; client_name?: string };

function oauthSecret(): string {
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not configured.');
  return secret;
}

function encode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
}

export async function createClientId(registration: ClientRegistration): Promise<string> {
  const body = encode(JSON.stringify({ redirect_uris: registration.redirect_uris, client_name: registration.client_name?.slice(0, 100), issued_at: Date.now() }));
  return `${body}.${await hmac(body, oauthSecret())}`;
}

export async function verifyClient(clientId: string, redirectUri: string): Promise<boolean> {
  const [body, signature] = clientId.split('.');
  if (!body || !signature || !(await secureEqual(await hmac(body, oauthSecret()), signature))) return false;
  try {
    const registration = JSON.parse(decode(body)) as ClientRegistration;
    return Array.isArray(registration.redirect_uris) && registration.redirect_uris.includes(redirectUri);
  } catch { return false; }
}

export function trustedOrigin(request: Request): string {
  const configured = env.PUBLIC_APP_URL ?? process.env.PUBLIC_APP_URL;
  if (configured) return configured.replace(/\/$/, '');
  return new URL(request.url).origin;
}
