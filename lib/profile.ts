import { runtimeEnv as env } from './runtime-env';
import { calculateWorkflowIndex } from '@ai-native-profile/scoring';
import { ensureDb } from '../db/ensure';
import { demoProfile, type PublicProfile } from './demo-profile';
import { backendOrigin, backendResponse } from './server-api';

type MetricRow = { date: string; source: string; metric_name: string; value: number; provenance: string; competitive_eligible: number };
type CoverageRow = { source: string; completeness: string; last_synced_at: string; provenance?: string };
type ProfileUser = { id: string; github_login: string; display_name: string; avatar_url: string; public_enabled: number };

const sourceLabel: Record<string, string> = { codex: 'Codex', claude_code: 'Claude Code', cursor: 'Cursor', gemini_cli: 'Gemini CLI', copilot_cli: 'GitHub Copilot CLI', chatgpt_web: 'ChatGPT Web', claude_web: 'Claude Web', github: 'GitHub' };
const provenanceLabel: Record<string, string> = { official_account_api: 'Official account', official_export: 'Official export', local_exact: 'Local exact', local_derived: 'Local derived', mcp_observed: 'MCP observed', estimated: 'Estimated' };

function longestStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort();
  let best = 0; let current = 0; let previous = 0;
  for (const date of unique) {
    const day = Date.parse(`${date}T00:00:00Z`) / 86_400_000;
    current = day === previous + 1 ? current + 1 : 1;
    best = Math.max(best, current); previous = day;
  }
  return best;
}

function currentStreak(dates: string[]): number {
  const days = new Set(dates);
  let cursor = new Date();
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) cursor = new Date(cursor.getTime() - 86_400_000);
  let count = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) { count += 1; cursor = new Date(cursor.getTime() - 86_400_000); }
  return count;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  if (username === 'demo') return demoProfile;
  if (backendOrigin()) {
    const response = await backendResponse(`/api/v1/profile/${encodeURIComponent(username)}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Profile service returned ${response.status}.`);
    return response.json() as Promise<PublicProfile>;
  }
  return getPublicProfileFromDatabase(username);
}

export async function getPublicProfileFromDatabase(username: string): Promise<PublicProfile | null> {
  if (username === 'demo') return demoProfile;
  await ensureDb();
  const user = await env.DB.prepare(`SELECT id, github_login, display_name, avatar_url, public_enabled FROM users WHERE lower(github_login)=lower(?) LIMIT 1`).bind(username).first<ProfileUser>();
  if (!user || !user.public_enabled) return null;
  return buildProfile(user);
}

export async function getPrivateProfile(userId: string): Promise<PublicProfile | null> {
  if (backendOrigin()) {
    const response = await backendResponse('/api/v1/me/profile', { authenticated: true });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Profile service returned ${response.status}.`);
    return response.json() as Promise<PublicProfile>;
  }
  return getPrivateProfileFromDatabase(userId);
}

export async function getPrivateProfileFromDatabase(userId: string): Promise<PublicProfile | null> {
  await ensureDb();
  const user = await env.DB.prepare(`SELECT id, github_login, display_name, avatar_url, public_enabled FROM users WHERE id=? LIMIT 1`).bind(userId).first<ProfileUser>();
  return user ? buildProfile(user) : null;
}

async function buildProfile(user: ProfileUser): Promise<PublicProfile> {
  const metricResult = await env.DB.prepare(`SELECT date, source, metric_name, value, provenance, competitive_eligible FROM daily_metrics WHERE user_id=? AND date >= date('now','-365 days') ORDER BY date`).bind(user.id).all<MetricRow>();
  const coverageResult = await env.DB.prepare(`SELECT source, completeness, last_synced_at FROM source_coverage WHERE user_id=? ORDER BY source`).bind(user.id).all<CoverageRow>();
  const rawMetrics = metricResult.results ?? [];
  const officialCodexTokenDates = new Set(rawMetrics.filter((row) => row.source === 'codex' && row.metric_name === 'tokens' && row.provenance === 'official_account_api').map((row) => row.date));
  const metrics = rawMetrics.filter((row) => !(row.source === 'codex' && row.metric_name === 'tokens' && row.provenance !== 'official_account_api' && officialCodexTokenDates.has(row.date)));
  const eligible = metrics.filter((row) => row.competitive_eligible && !['github', 'chatgpt_web', 'claude_web'].includes(row.source));
  const activeDates = [...new Set(eligible.filter((row) => row.value > 0).map((row) => row.date))];
  const sum = (name: string, rows = metrics) => rows.filter((row) => row.metric_name === name).reduce((total, row) => total + row.value, 0);
  const sources = [...new Set(eligible.map((row) => row.source))];
  const sessions = sum('sessions', eligible);
  const githubRows = metrics.filter((row) => row.source === 'github');
  const score = calculateWorkflowIndex({
    githubConnected: coverageResult.results?.some((row) => row.source === 'github') ?? false, coveredDays: activeDates.length, activeCodingDays90: activeDates.filter((date) => Date.parse(date) >= Date.now() - 90 * 86_400_000).length,
    longestStreak90: longestStreak(activeDates.filter((date) => Date.parse(date) >= Date.now() - 90 * 86_400_000)),
    toolUsingSessionRate: sessions ? sum('tool_using_sessions', eligible) / sessions : 0,
    medianToolCallsPerSession: sessions ? sum('tool_calls', eligible) / sessions : 0,
    advancedWorkflowSessionRate: sessions ? sum('advanced_workflow_sessions', eligible) / sessions : 0,
    activeCodingProviders: sources.length, commits: sum('commits', githubRows), mergedPullRequests: sum('merged_pull_requests', githubRows), reviews: sum('reviews', githubRows), releases: sum('releases', githubRows),
  });
  const byDate = new Map<string, number>();
  for (const row of eligible) if (row.value > 0) byDate.set(row.date, (byDate.get(row.date) ?? 0) + 1);
  const activity = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(Date.now() - (83 - index) * 86_400_000).toISOString().slice(0, 10);
    return { date, value: Math.min(4, byDate.get(date) ?? 0) };
  });
  const latest = coverageResult.results?.map((row) => row.last_synced_at).sort().at(-1) ?? new Date().toISOString();
  return {
    ...demoProfile, username: user.github_login, name: user.display_name, avatarUrl: user.avatar_url, verified: true, publicEnabled: Boolean(user.public_enabled), score: score.total ?? 0, scoreEligible: score.eligible, scoreReason: score.reason, scoreBreakdown: { consistency: score.consistency, workflowDepth: score.workflowDepth, providerBreadth: score.providerBreadth, delivery: score.delivery }, rank: 0,
    activeDays: activeDates.length, currentStreak: currentStreak(activeDates), longestStreak: longestStreak(activeDates), lifetimeTokens: sum('tokens', eligible), sessions,
    deliveryPoints: score.deliveryPoints, providers: sources.map((source) => sourceLabel[source] ?? source), activity,
    coverage: (coverageResult.results ?? []).map((row) => ({ source: row.source, label: sourceLabel[row.source] ?? row.source, provenance: provenanceLabel[metrics.find((metric) => metric.source === row.source)?.provenance ?? ''] ?? 'Unknown', status: row.completeness === 'full' ? 'Live' : 'Partial', completeness: row.completeness })),
    github: { commits: sum('commits', githubRows), mergedPullRequests: sum('merged_pull_requests', githubRows), reviews: sum('reviews', githubRows), releases: sum('releases', githubRows) },
    conversation: { sessions: sum('sessions', metrics.filter((row) => ['chatgpt_web', 'claude_web'].includes(row.source))), activeDays: new Set(metrics.filter((row) => ['chatgpt_web', 'claude_web'].includes(row.source)).map((row) => row.date)).size, coverage: 'Partial and excluded from ranking' }, updatedAt: latest,
  };
}
