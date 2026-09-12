import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { sha256 } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { deviceId?: string; deviceCode?: string };
  if (!body.deviceId || !body.deviceCode) return NextResponse.json({ error: 'deviceId and deviceCode are required.' }, { status: 400 });
  await ensureDb();
  const device = await env.DB.prepare(`SELECT status, device_code_hash, token_delivered, expires_at FROM devices WHERE id=? LIMIT 1`).bind(body.deviceId).first<{ status: string; device_code_hash: string; token_delivered: number; expires_at: string }>();
  if (!device || device.device_code_hash !== await sha256(body.deviceCode)) return NextResponse.json({ error: 'Invalid device authorization.' }, { status: 403 });
  if (device.expires_at <= new Date().toISOString() && device.status === 'pending') return NextResponse.json({ status: 'expired' }, { status: 410 });
  if (device.status === 'pending') return NextResponse.json({ status: 'pending' }, { status: 202 });
  if (device.status !== 'approved' || device.token_delivered) return NextResponse.json({ status: device.status }, { status: 409 });
  const object = await env.FILES.get(`device-tokens/${body.deviceId}`);
  if (!object) return NextResponse.json({ error: 'Device token is no longer available. Pair again.' }, { status: 410 });
  const deviceToken = await object.text();
  await env.DB.prepare(`UPDATE devices SET token_delivered=1 WHERE id=?`).bind(body.deviceId).run();
  await env.FILES.delete(`device-tokens/${body.deviceId}`);
  return NextResponse.json({ status: 'approved', deviceToken });
}
