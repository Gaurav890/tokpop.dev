import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { randomToken, sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { deviceName?: string; collectorVersion?: string };
  const deviceId = crypto.randomUUID();
  const deviceCode = randomToken(32);
  const userCode = randomToken(6).slice(0, 8).toUpperCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  await ensureDb();
  await env.DB.prepare(`INSERT INTO devices (id, name, collector_version, device_code_hash, user_code_hash, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`)
    .bind(deviceId, String(body.deviceName ?? 'Developer device').slice(0, 80), String(body.collectorVersion ?? 'unknown').slice(0, 30), await sha256(deviceCode), await sha256(userCode), expiresAt, now.toISOString()).run();
  return NextResponse.json({ deviceId, deviceCode, userCode, verificationUrl: new URL(`/connect?code=${encodeURIComponent(userCode)}`, request.url).toString(), expiresAt }, { status: 201 });
}
