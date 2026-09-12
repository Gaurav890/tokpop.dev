import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../db/ensure';
import { randomToken, sha256 } from '../../../lib/crypto';
import { verifyClient } from '../../../lib/oauth';

const oauthError = (error: string, description: string, status = 400) => NextResponse.json({ error, error_description: description }, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const grantType = String(form.get('grant_type') ?? '');
  const code = String(form.get('code') ?? '');
  const clientId = String(form.get('client_id') ?? '');
  const redirectUri = String(form.get('redirect_uri') ?? '');
  const verifier = String(form.get('code_verifier') ?? '');
  if (grantType !== 'authorization_code' || !code || !clientId || !redirectUri || !verifier) return oauthError('invalid_request', 'authorization_code, code, client_id, redirect_uri, and code_verifier are required.');
  if (!(await verifyClient(clientId, redirectUri))) return oauthError('invalid_client', 'Client or redirect URI could not be verified.', 401);
  await ensureDb();
  const record = await env.DB.prepare(`SELECT user_id, client_id, redirect_uri, code_challenge, scope, expires_at, used_at FROM oauth_codes WHERE code_hash=? LIMIT 1`).bind(await sha256(code)).first<{ user_id: string; client_id: string; redirect_uri: string; code_challenge: string; scope: string; expires_at: string; used_at: string | null }>();
  if (!record || record.used_at || record.expires_at <= new Date().toISOString()) return oauthError('invalid_grant', 'Authorization code is invalid, expired, or already used.');
  if (record.client_id !== clientId || record.redirect_uri !== redirectUri || record.code_challenge !== await sha256(verifier)) return oauthError('invalid_grant', 'PKCE or client binding verification failed.');
  const accessToken = randomToken(40);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE oauth_codes SET used_at=? WHERE code_hash=?').bind(now, await sha256(code)),
    env.DB.prepare('INSERT INTO oauth_tokens (token_hash,user_id,scope,expires_at,created_at) VALUES (?,?,?,?,?)').bind(await sha256(accessToken), record.user_id, record.scope, expiresAt, now),
  ]);
  return NextResponse.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 30 * 24 * 60 * 60, scope: record.scope }, { headers: { 'cache-control': 'no-store' } });
}
