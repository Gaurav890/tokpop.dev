import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { randomToken, sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in with GitHub before approving a device.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { userCode?: string };
  const userCode = String(body.userCode ?? '').trim().toUpperCase();
  if (!userCode) return NextResponse.json({ error: 'Pairing code is required.' }, { status: 400 });
  await ensureDb();
  const device = await env.DB.prepare(`SELECT id, expires_at FROM devices WHERE user_code_hash = ? AND status = 'pending' LIMIT 1`).bind(await sha256(userCode)).first<{ id: string; expires_at: string }>();
  if (!device || device.expires_at <= new Date().toISOString()) return NextResponse.json({ error: 'Pairing code is invalid or expired.' }, { status: 404 });
  const deviceToken = randomToken(36);
  await env.DB.prepare(`UPDATE devices SET user_id=?, device_token_hash=?, status='approved' WHERE id=?`).bind(user.userId, await sha256(deviceToken), device.id).run();
  // The raw token is kept briefly in R2 and can only be redeemed with the high-entropy device code.
  await env.FILES.put(`device-tokens/${device.id}`, deviceToken, { customMetadata: { expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() } });
  return NextResponse.json({ ok: true, deviceId: device.id });
}
