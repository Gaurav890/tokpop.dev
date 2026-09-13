import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { hmac, randomToken } from '../../../../../lib/crypto';

export async function GET(request: NextRequest) {
  const clientId = env.GITHUB_CLIENT_ID ?? process.env.GITHUB_CLIENT_ID;
  const sessionSecret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!clientId || !sessionSecret) {
    return NextResponse.json({ error: 'GitHub OAuth is not configured. Add GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET.' }, { status: 503 });
  }
  const state = randomToken(24);
  const expires = Math.floor(Date.now() / 1000) + 600;
  const payload = `${state}.${expires}`;
  const signedState = `${payload}.${await hmac(payload, sessionSecret)}`;
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  const storageAuthorization = request.nextUrl.searchParams.get('scope') === 'repo';
  authorize.searchParams.set('scope', storageAuthorization ? 'read:user repo' : 'read:user');
  authorize.searchParams.set('state', state);
  const publicOrigin = (env.PUBLIC_APP_URL ?? request.nextUrl.origin).replace(/\/$/, '');
  authorize.searchParams.set('redirect_uri', `${publicOrigin}/api/auth/github/callback`);
  const response = NextResponse.redirect(authorize);
  response.cookies.set('anp_oauth_state', signedState, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 600 });
  const returnTo = request.nextUrl.searchParams.get('return_to');
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) response.cookies.set('anp_auth_return', returnTo, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 600 });
  if (storageAuthorization) response.cookies.set('anp_auth_storage', '1', { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: 600 });
  return response;
}
