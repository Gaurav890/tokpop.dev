import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { openJson, sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { userCode?: string; deviceName?: string; collectorVersion?: string };
  const userCode = String(body.userCode ?? '').trim().toUpperCase();
  if (!userCode) return NextResponse.json({ error: 'A connection code is required.' }, { status: 400 });

  await ensureDb();
  const device = await env.DB.prepare(`SELECT id, status, user_id, token_delivered, pending_token_ciphertext, expires_at FROM devices WHERE user_code_hash=? LIMIT 1`)
    .bind(await sha256(userCode))
    .first<{ id: string; status: string; user_id: string | null; token_delivered: number; pending_token_ciphertext: string | null; expires_at: string }>();

  if (!device || !device.user_id || device.status !== 'approved') return NextResponse.json({ error: 'The connection code is invalid.' }, { status: 404 });
  if (device.expires_at <= new Date().toISOString()) return NextResponse.json({ error: 'The connection code expired. Generate a new command from your profile.' }, { status: 410 });
  if (device.token_delivered || !device.pending_token_ciphertext) return NextResponse.json({ error: 'The connection code has already been used.' }, { status: 409 });
  if (!env.SESSION_SECRET) return NextResponse.json({ error: 'Device token encryption is not configured.' }, { status: 503 });

  const { token: deviceToken } = await openJson<{ token: string }>(device.pending_token_ciphertext, env.SESSION_SECRET);
  const result = await env.DB.prepare(`UPDATE devices SET name=?, collector_version=?, token_delivered=1, pending_token_ciphertext=NULL WHERE id=? AND token_delivered=0`)
    .bind(String(body.deviceName ?? 'Developer device').slice(0, 80), String(body.collectorVersion ?? 'unknown').slice(0, 30), device.id)
    .run();
  if (!result.meta.changes) return NextResponse.json({ error: 'The connection code has already been used.' }, { status: 409 });

  return NextResponse.json({ deviceId: device.id, deviceToken }, { headers: { 'cache-control': 'private, no-store' } });
}
