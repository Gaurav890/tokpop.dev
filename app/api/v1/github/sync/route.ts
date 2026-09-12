import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { canonicalJson, hmac, openJson } from '../../../../../lib/crypto';
import { persistGithubSnapshot } from '../../../../../lib/github-storage';

type GitHubEvent = { type?: string; created_at?: string; payload?: { commits?: unknown[]; action?: string; pull_request?: { merged?: boolean }; review?: unknown; release?: unknown } };

export async function POST() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureDb();
  const record = await env.DB.prepare('SELECT github_token_ciphertext FROM users WHERE id=?').bind(user.userId).first<{ github_token_ciphertext: string | null }>();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!record?.github_token_ciphertext || !secret) return NextResponse.json({ error: 'Reconnect GitHub before syncing.' }, { status: 409 });
  const { token } = await openJson<{ token: string }>(record.github_token_ciphertext, secret);
  const events: GitHubEvent[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(user.login)}/events?per_page=100&page=${page}`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28', 'user-agent': 'ai-native-profile' } });
    if (!response.ok) return NextResponse.json({ error: `GitHub activity lookup failed (${response.status}).` }, { status: 502 });
    const pageEvents = await response.json() as GitHubEvent[];
    events.push(...pageEvents);
    if (pageEvents.length < 100) break;
  }
  const days = new Map<string, Record<string, number>>();
  for (const event of events) {
    if (!event.created_at) continue;
    const date = event.created_at.slice(0, 10);
    const row = days.get(date) ?? { commits: 0, merged_pull_requests: 0, reviews: 0, releases: 0 };
    if (event.type === 'PushEvent') row.commits += event.payload?.commits?.length ?? 0;
    if (event.type === 'PullRequestEvent' && event.payload?.action === 'closed' && event.payload.pull_request?.merged) row.merged_pull_requests += 1;
    if (event.type === 'PullRequestReviewEvent' && event.payload?.action === 'created') row.reviews += 1;
    if (event.type === 'ReleaseEvent' && event.payload?.action === 'published') row.releases += 1;
    days.set(date, row);
  }
  const dates = [...days.keys()].sort();
  const storage = await env.DB.prepare('SELECT storage_mode FROM users WHERE id=?').bind(user.userId).first<{ storage_mode: string }>();
  if (storage?.storage_mode === 'github') {
    const generatedAt = new Date().toISOString(); const id = crypto.randomUUID(); const aggregate = { schemaVersion: 'anp.github-delivery.v1', id, generatedAt, days: [...days.entries()].map(([date, metrics]) => ({ date, metrics })) }; const signingSecret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
    if (!signingSecret) return NextResponse.json({ error: 'Snapshot signing is not configured.' }, { status: 503 });
    try { await persistGithubSnapshot(user.userId, `github/${generatedAt.slice(0, 7).replace('-', '/')}/${id}.json`, { ...aggregate, signature: await hmac(canonicalJson(aggregate), signingSecret) }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub-backed snapshot failed.' }, { status: 502 }); }
  }
  const statements = [];
  for (const [date, metrics] of days) for (const [name, value] of Object.entries(metrics)) statements.push(env.DB.prepare(`INSERT INTO daily_metrics (user_id,date,source,category,metric_name,value,unit,provenance,competitive_eligible) VALUES (?,?,'github','delivery',?,?,'count','official_account_api',1) ON CONFLICT(user_id,date,source,metric_name,provenance) DO UPDATE SET value=excluded.value`).bind(user.userId, date, name, value));
  const today = new Date().toISOString().slice(0, 10);
  statements.push(env.DB.prepare(`INSERT INTO source_coverage (user_id,source,coverage_start,coverage_end,last_synced_at,completeness,competitive_eligible,note) VALUES (?,'github',?,?,?,'partial',1,?) ON CONFLICT(user_id,source) DO UPDATE SET coverage_start=excluded.coverage_start,coverage_end=excluded.coverage_end,last_synced_at=excluded.last_synced_at,completeness='partial',competitive_eligible=1,note=excluded.note`).bind(user.userId, dates[0] ?? today, dates.at(-1) ?? today, new Date().toISOString(), 'Public Events API window; private-repository aggregates require an optional GitHub App installation.'));
  await env.DB.batch(statements);
  return NextResponse.json({ ok: true, events: events.length, activeDays: days.size, coverageStart: dates[0] ?? today, coverageEnd: dates.at(-1) ?? today });
}
