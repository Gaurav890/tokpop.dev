import { runtimeEnv as env } from '../../../../../lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { canonicalJson, hmac } from '../../../../../lib/crypto';
import { persistGithubSnapshot, removeGithubImportSnapshots } from '../../../../../lib/github-storage';

type ImportBody = { source?: string; days?: Array<{ date?: string; sessions?: number; turns?: number }>; coverageStart?: string; coverageEnd?: string };
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in with GitHub before importing.' }, { status: 401 });
  const body = await request.json().catch(() => null) as ImportBody | null;
  if (!body || !['chatgpt_web', 'claude_web'].includes(body.source ?? '') || !Array.isArray(body.days) || body.days.length > 10000 || !datePattern.test(body.coverageStart ?? '') || !datePattern.test(body.coverageEnd ?? '')) return NextResponse.json({ error: 'The aggregate payload is invalid.' }, { status: 400 });
  if (body.days.some((day) => !day || !datePattern.test(day.date ?? '') || !Number.isSafeInteger(day.sessions) || !Number.isSafeInteger(day.turns) || Number(day.sessions) < 0 || Number(day.turns) < 0)) return NextResponse.json({ error: 'One or more daily aggregate rows are invalid.' }, { status: 400 });
  await ensureDb();
  const storage = await env.DB.prepare('SELECT storage_mode FROM users WHERE id=?').bind(user.userId).first<{ storage_mode: string }>();
  if (storage?.storage_mode === 'github') {
    const id = crypto.randomUUID(); const base = { schemaVersion: 'anp.web-import.v1', id, importedAt: new Date().toISOString(), source: body.source, coverageStart: body.coverageStart, coverageEnd: body.coverageEnd, days: body.days.map(({ date, sessions, turns }) => ({ date, sessions, turns })) }; const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) return NextResponse.json({ error: 'Snapshot signing is not configured.' }, { status: 503 });
    try { if (!await persistGithubSnapshot(user.userId, `imports/${base.importedAt.slice(0, 7).replace('-', '/')}/${id}.json`, { ...base, signature: await hmac(canonicalJson(base), secret) })) throw new Error('Reconnect GitHub storage before importing.'); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub-backed snapshot failed.' }, { status: 502 }); }
  }
  const statements = [];
  for (const day of body.days) for (const [name, value] of [['sessions', day.sessions], ['turns', day.turns]] as const) statements.push(env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,?,?,?,?,'count','official_export',0) ON CONFLICT(user_id,date,source,metric_name,provenance) DO UPDATE SET value=excluded.value`).bind(user.userId, day.date, body.source, 'conversation', name, value));
  statements.push(env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,?,?,?,?,'full',0,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=excluded.coverage_start,coverage_end=excluded.coverage_end,last_synced_at=excluded.last_synced_at,completeness='full',competitive_eligible=0,note=excluded.note`).bind(user.userId, body.source, body.coverageStart, body.coverageEnd, new Date().toISOString(), 'Official export parsed locally; coverage ends at the latest exported timestamp.'));
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true, acceptedDays: body.days.length });
}

export async function DELETE(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in before removing imported data.' }, { status: 401 });
  if (request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ error: 'Open Connections to remove imported data.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || !['chatgpt_web', 'claude_web'].includes(body.source) || body.confirm !== true) return NextResponse.json({ error: 'Choose a conversation source and confirm removal.' }, { status: 400 });
  await ensureDb();
  let removedSnapshots: number;
  try { removedSnapshots = await removeGithubImportSnapshots(user.userId, body.source); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not remove GitHub snapshots. Nothing was removed from your profile.' }, { status: 502 }); }
  try {
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM daily_metrics WHERE user_id=? AND source=? AND provenance='official_export'`).bind(user.userId, body.source),
      env.DB.prepare(`DELETE FROM source_coverage WHERE user_id=? AND source=? AND NOT EXISTS (SELECT 1 FROM daily_metrics WHERE user_id=? AND source=?)`).bind(user.userId, body.source, user.userId, body.source),
      env.DB.prepare(`UPDATE source_coverage SET
        coverage_start=(SELECT date FROM daily_metrics WHERE user_id=? AND source=? ORDER BY date ASC LIMIT 1),
        coverage_end=(SELECT date FROM daily_metrics WHERE user_id=? AND source=? ORDER BY date DESC LIMIT 1),
        last_synced_at=COALESCE((SELECT observed_at FROM mcp_events WHERE user_id=? AND source=? ORDER BY observed_at DESC LIMIT 1),last_synced_at),
        completeness='partial',competitive_eligible=0,note='Explicit MCP observations only; not complete provider history.'
        WHERE user_id=? AND source=?`).bind(user.userId, body.source, user.userId, body.source, user.userId, body.source, user.userId, body.source),
    ]);
  } catch { return NextResponse.json({ error: 'Snapshot cleanup finished, but profile cleanup failed. Retry removal to finish.' }, { status: 503 }); }
  return NextResponse.json({ ok: true, removedSnapshots, note: 'Imported data removed. Git history and copies outside this account are not erased.' });
}
