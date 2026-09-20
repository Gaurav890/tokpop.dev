import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { randomToken, sealJson, sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { deviceName?: string; collectorVersion?: string; flow?: string };
  const webInitiated = body.flow === 'onboarding';
  const user = webInitiated ? await currentGitHubUser() : null;
  if (webInitiated && !user) return NextResponse.json({ error: 'Sign in with GitHub before creating a connection command.' }, { status: 401 });
  const deviceId = crypto.randomUUID();
  const deviceCode = randomToken(32);
  const userCode = randomToken(webInitiated ? 9 : 6).slice(0, webInitiated ? 12 : 8).toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  await ensureDb();
  if (webInitiated && user) {
    const secret = env.SESSION_SECRET;
    if (!secret) return NextResponse.json({ error: 'Device token encryption is not configured.' }, { status: 503 });
    const deviceToken = randomToken(36);
    const pendingToken = await sealJson({ token: deviceToken }, secret);
    await env.DB.prepare(`INSERT INTO devices (id, user_id, name, collector_version, device_code_hash, user_code_hash, device_token_hash, pending_token_ciphertext, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)`)
      .bind(deviceId, user.userId, 'New coding connector', String(body.collectorVersion ?? 'browser-onboarding').slice(0, 30), await sha256(deviceCode), await sha256(userCode), await sha256(deviceToken), pendingToken, expiresAt, now.toISOString()).run();
    return NextResponse.json({ deviceId, userCode, expiresAt, status: 'approved' }, { status: 201, headers: { 'cache-control': 'private, no-store' } });
  }
  await env.DB.prepare(`INSERT INTO devices (id, name, collector_version, device_code_hash, user_code_hash, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`)
    .bind(deviceId, String(body.deviceName ?? 'Developer device').slice(0, 80), String(body.collectorVersion ?? 'unknown').slice(0, 30), await sha256(deviceCode), await sha256(userCode), expiresAt, now.toISOString()).run();
  return NextResponse.json({ deviceId, deviceCode, userCode, verificationUrl: new URL(`/connect?code=${encodeURIComponent(userCode)}`, env.PUBLIC_APP_URL ?? request.nextUrl.origin).toString(), expiresAt }, { status: 201 });
}
