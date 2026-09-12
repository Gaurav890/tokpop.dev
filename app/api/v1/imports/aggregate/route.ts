import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { canonicalJson, hmac } from '../../../../../lib/crypto';
import { persistGithubSnapshot } from '../../../../../lib/github-storage';

type ImportBody = { source?: string; days?: Array<{ date?: string; sessions?: number; turns?: number }>; coverageStart?: string; coverageEnd?: string };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in with GitHub before importing.' }, { status: 401 });
  const body = await request.json().catch(() => null) as ImportBody | null;
  if (!body || !['chatgpt_web', 'claude_web'].includes(body.source ?? '') || !Array.isArray(body.days) || body.days.length > 10000 || !datePattern.test(body.coverageStart ?? '') || !datePattern.test(body.coverageEnd ?? '')) return NextResponse.json({ error: 'The aggregate payload is invalid.' }, { status: 400 });
  if (body.days.some((day) => !datePattern.test(day.date ?? '') || !Number.isSafeInteger(day.sessions) || !Number.isSafeInteger(day.turns) || Number(day.sessions) < 0 || Number(day.turns) < 0)) return NextResponse.json({ error: 'One or more daily aggregate rows are invalid.' }, { status: 400 });
  await ensureDb();
  const storage = await env.DB.prepare('SELECT storage_mode FROM users WHERE id=?').bind(user.userId).first<{ storage_mode: string }>();
  if (storage?.storage_mode === 'github') {
    const id = crypto.randomUUID(); const base = { schemaVersion: 'anp.web-import.v1', id, importedAt: new Date().toISOString(), ...body }; const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) return NextResponse.json({ error: 'Snapshot signing is not configured.' }, { status: 503 });
    try { await persistGithubSnapshot(user.userId, `imports/${base.importedAt.slice(0, 7).replace('-', '/')}/${id}.json`, { ...base, signature: await hmac(canonicalJson(base), secret) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub-backed snapshot failed.' }, { status: 502 }); }
  }
  const statements = [];
  for (const day of body.days) for (const [name, value] of [['sessions', day.sessions], ['turns', day.turns]] as const) statements.push(env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,?,?,?,?,'count','official_export',0) ON CONFLICT(user_id,date,source,metric_name,provenance) DO UPDATE SET value=excluded.value`).bind(user.userId, day.date, body.source, 'conversation', name, value));
  statements.push(env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,?,?,?,?,'full',0,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=excluded.coverage_start,coverage_end=excluded.coverage_end,last_synced_at=excluded.last_synced_at,completeness='full',competitive_eligible=0,note=excluded.note`).bind(user.userId, body.source, body.coverageStart, body.coverageEnd, new Date().toISOString(), 'Official export parsed locally; coverage ends at the latest exported timestamp.'));
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true, acceptedDays: body.days.length });
}
