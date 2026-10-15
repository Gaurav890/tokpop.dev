import { githubContributionSchema } from './github-contribution-api';

export function syncFreshness(lastSyncedAt?: string | null, now = Date.now()) {
  const time = Date.parse(lastSyncedAt ?? '');
  if (!Number.isFinite(time) || time > now + 60_000) return 'unknown';
  return now - time <= 45 * 60_000 ? 'recent' : 'delayed';
}

export function sourceSyncSummary(sources: Array<{ lastSyncedAt?: string | null }>, now = Date.now()) {
  if (!sources.length) return 'Waiting for your first coding sync';
  const states = sources.map((source) => syncFreshness(source.lastSyncedAt, now));
  if (states.includes('delayed')) return 'Some sources have not synced recently';
  if (states.includes('unknown')) return 'Sync timing is not available yet';
  return 'Sources synced recently';
}

type ReceiptCoverage = { note?: string; coverage_start?: string; coverage_end?: string; last_synced_at?: string };

export function githubReceiptWindow(coverage?: ReceiptCoverage, now = Date.now()) {
  const start = Date.parse(`${coverage?.coverage_start}T00:00:00Z`);
  const end = Date.parse(`${coverage?.coverage_end}T00:00:00Z`);
  const synced = Date.parse(coverage?.last_synced_at ?? '');
  const verified = Boolean(coverage?.note?.startsWith(`${githubContributionSchema}:`) && Number.isFinite(start) && Number.isFinite(end) && end - start === 89 * 86_400_000 && end <= now && synced >= end && synced < end + 86_400_000 && synced <= now + 60_000);
  return { verified, fresh: verified && now - synced <= 24 * 60 * 60_000 };
}

export function utcTimestamp(value?: string | null) {
  const time = Date.parse(value ?? '');
  return Number.isFinite(time) ? `${new Date(time).toISOString().slice(0, 16).replace('T', ' ')} UTC` : 'Not recorded';
}
