import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { sessionCookieName, signSession } from '../../../../../lib/auth';
import { hmac, sealJson, secureEqual } from '../../../../../lib/crypto';

type GitHubUser = { id: number; login: string; name: string | null; avatar_url: string };

export async function GET(request: NextRequest) {
  const clientId = env.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_CLIENT_SECRET;
  const sessionSecret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!clientId || !clientSecret || !sessionSecret) return NextResponse.json({ error: 'GitHub OAuth is not configured.' }, { status: 503 });

  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const signedState = request.cookies.get('anp_oauth_state')?.value;
  const [storedState, expiresText, signature] = signedState?.split('.') ?? [];
  const statePayload = `${storedState}.${expiresText}`;
  const stateValid = state && code && storedState === state && Number(expiresText) > Date.now() / 1000 && signature && await secureEqual(await hmac(statePayload, sessionSecret), signature);
  if (!stateValid) return NextResponse.json({ error: 'The GitHub sign-in request expired or could not be verified.' }, { status: 400 });

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: new URL('/api/auth/github/callback', request.url).toString() }),
  });
  const tokenBody = await tokenResponse.json() as { access_token?: string; scope?: string; error_description?: string };
  if (!tokenResponse.ok || !tokenBody.access_token) return NextResponse.json({ error: tokenBody.error_description ?? 'GitHub token exchange failed.' }, { status: 502 });

  const userResponse = await fetch('https://api.github.com/user', { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${tokenBody.access_token}`, 'user-agent': 'ai-native-profile' } });
  const github = await userResponse.json() as GitHubUser;
  if (!userResponse.ok || !github.id || !github.login) return NextResponse.json({ error: 'GitHub identity lookup failed.' }, { status: 502 });

  await ensureDb();
  const now = new Date().toISOString();
  const userId = `github:${github.id}`;
  const encryptedToken = await sealJson({ token: tokenBody.access_token }, sessionSecret);
  await env.DB.prepare(`INSERT INTO users (id, github_id, github_login, display_name, avatar_url, github_token_ciphertext, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login, display_name=excluded.display_name, avatar_url=excluded.avatar_url, github_token_ciphertext=excluded.github_token_ciphertext, updated_at=excluded.updated_at`)
    .bind(userId, String(github.id), github.login, github.name ?? github.login, github.avatar_url, encryptedToken, now, now).run();
  if (request.cookies.get('anp_auth_storage')?.value === '1') await env.DB.prepare(`INSERT INTO github_storage (user_id,scopes) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET scopes=excluded.scopes`).bind(userId, tokenBody.scope ?? '').run();

  const session = await signSession({ userId, login: github.login, name: github.name ?? github.login, avatarUrl: github.avatar_url, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 });
  const returnTo = request.cookies.get('anp_auth_return')?.value;
  const safeReturnTo = returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/dashboard';
  const response = NextResponse.redirect(new URL(safeReturnTo, request.url));
  response.cookies.set(sessionCookieName, session, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 60 * 60 * 24 * 30 });
  response.cookies.delete('anp_oauth_state');
  response.cookies.delete('anp_auth_return');
  response.cookies.delete('anp_auth_storage');
  return response;
}
