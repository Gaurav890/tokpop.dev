import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { privacyCheck } from '@ai-native-profile/adapters';
import { ensureDb } from '../../../../../db/ensure';
import { canonicalJson, hmac, secureEqual, sha256 } from '../../../../../lib/crypto';
import { persistGithubSnapshot } from '../../../../../lib/github-storage';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return NextResponse.json({ error: 'A device bearer token is required.' }, { status: 401 });
  await ensureDb();
  const device = await env.DB.prepare(`SELECT id, user_id, status FROM devices WHERE device_token_hash=? LIMIT 1`).bind(await sha256(token)).first<{ id: string; user_id: string; status: string }>();
  if (!device || device.status !== 'approved' || !device.user_id) return NextResponse.json({ error: 'Device token is invalid or revoked.' }, { status: 403 });
  const candidate = await request.json().catch(() => null);
  const checked = privacyCheck(candidate);
  if (!checked.ok) return NextResponse.json({ error: 'Batch failed schema or privacy validation.', details: checked.errors }, { status: 400 });
  const batch = checked.batch;
  if (batch.deviceId !== device.id) return NextResponse.json({ error: 'Batch device does not match the bearer token.' }, { status: 403 });
  const expected = await hmac(canonicalJson({ ...batch, signature: undefined }), token);
  if (!(await secureEqual(expected, batch.signature))) return NextResponse.json({ error: 'Batch signature is invalid.' }, { status: 403 });
  const existing = await env.DB.prepare('SELECT id FROM metric_batches WHERE id=? LIMIT 1').bind(batch.batchId).first();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });
  const storage = await env.DB.prepare('SELECT storage_mode FROM users WHERE id=?').bind(device.user_id).first<{ storage_mode: string }>();
  if (storage?.storage_mode === 'github') {
    try { if (!(await persistGithubSnapshot(device.user_id, `snapshots/${batch.generatedAt.slice(0, 7).replace('-', '/')}/${batch.batchId}.json`, batch))) return NextResponse.json({ error: 'GitHub-backed storage is not configured.' }, { status: 409 }); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub-backed snapshot failed.' }, { status: 502 }); }
  }
  const now = new Date().toISOString();
  const statements = [env.DB.prepare(`INSERT INTO metric_batches (id, user_id, device_id, generated_at, collector_version, received_at) VALUES (?, ?, ?, ?, ?, ?)`).bind(batch.batchId, device.user_id, device.id, batch.generatedAt, batch.collectorVersion, now)];
  for (const day of batch.daily) for (const metric of day.metrics) statements.push(env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,date,source,metric_name,provenance) DO UPDATE SET value=excluded.value,unit=excluded.unit,competitive_eligible=excluded.competitive_eligible`).bind(device.user_id, day.date, day.source, day.category, metric.name, Math.round(metric.value), metric.unit, metric.provenance, metric.competitiveEligible ? 1 : 0));
  for (const item of batch.coverage) statements.push(env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=min(coverage_start,excluded.coverage_start),coverage_end=max(coverage_end,excluded.coverage_end),last_synced_at=excluded.last_synced_at,completeness=excluded.completeness,competitive_eligible=excluded.competitive_eligible,note=excluded.note`).bind(device.user_id, item.source, item.coverageStart, item.coverageEnd, item.lastSyncedAt, item.completeness, item.competitiveEligible ? 1 : 0, item.note ?? null));
  statements.push(env.DB.prepare('UPDATE devices SET last_seen_at=? WHERE id=?').bind(now, device.id));
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true, acceptedDays: batch.daily.length }, { status: 202 });
}
