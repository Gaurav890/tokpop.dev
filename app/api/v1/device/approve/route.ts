import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { randomToken, sealJson, sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in with GitHub before approving a device.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { userCode?: string };
  const userCode = String(body.userCode ?? '').trim().toUpperCase();
  if (!userCode) return NextResponse.json({ error: 'Pairing code is required.' }, { status: 400 });
  await ensureDb();
  const device = await env.DB.prepare(`SELECT id, expires_at FROM devices WHERE user_code_hash = ? AND status = 'pending' LIMIT 1`).bind(await sha256(userCode)).first<{ id: string; expires_at: string }>();
  if (!device || device.expires_at <= new Date().toISOString()) return NextResponse.json({ error: 'Pairing code is invalid or expired.' }, { status: 404 });
  const secret = env.SESSION_SECRET;
  if (!secret) return NextResponse.json({ error: 'Device token encryption is not configured.' }, { status: 503 });
  const deviceToken = randomToken(36);
  const pendingToken = await sealJson({ token: deviceToken }, secret);
  await env.DB.prepare(`UPDATE devices SET user_id=?, device_token_hash=?, pending_token_ciphertext=?, status='approved' WHERE id=?`).bind(user.userId, await sha256(deviceToken), pendingToken, device.id).run();
  return NextResponse.json({ ok: true, deviceId: device.id });
}
