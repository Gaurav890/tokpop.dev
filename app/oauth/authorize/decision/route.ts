import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { currentGitHubUser } from '../../../../lib/auth';
import { randomToken, sha256 } from '../../../../lib/crypto';
import { verifyClient } from '../../../../lib/oauth';

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const form = await request.formData();
  const clientId = String(form.get('client_id') ?? '');
  const redirectUri = String(form.get('redirect_uri') ?? '');
  const state = String(form.get('state') ?? '');
  if (!(await verifyClient(clientId, redirectUri))) return NextResponse.json({ error: 'Invalid OAuth client.' }, { status: 400 });
  const target = new URL(redirectUri);
  if (form.get('decision') !== 'approve') { target.searchParams.set('error', 'access_denied'); target.searchParams.set('state', state); return NextResponse.redirect(target); }
  const codeChallenge = String(form.get('code_challenge') ?? '');
  if (!codeChallenge) return NextResponse.json({ error: 'PKCE challenge is required.' }, { status: 400 });
  const code = randomToken(32);
  const scope = String(form.get('scope') ?? 'profile:read activity:write stories:write');
  await ensureDb();
  await env.DB.prepare(`INSERT INTO oauth_codes (code_hash,user_id,client_id,redirect_uri,code_challenge,scope,expires_at) VALUES (?,?,?,?,?,?,?)`).bind(await sha256(code), user.userId, clientId, redirectUri, codeChallenge, scope, new Date(Date.now() + 10 * 60 * 1000).toISOString()).run();
  target.searchParams.set('code', code); target.searchParams.set('state', state);
  return NextResponse.redirect(target);
}
