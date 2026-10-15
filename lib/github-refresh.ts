import { runtimeEnv as env } from './runtime-env';
import { ensureDb } from '../db/ensure';
import { canonicalJson, hmac, openJson } from './crypto';
import { githubReceiptWindow } from './data-freshness';
import { collectGitHubContributions, githubContributionSchema, githubContributionWindowDays, storeGitHubContributions } from './github-contributions';
import { persistGithubSnapshot } from './github-storage';

export class GitHubRefreshError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function refreshGitHubContributions(userId: string, { onlyIfStale = false, now = Date.now() } = {}) {
  await ensureDb();
  if (onlyIfStale) {
    const coverage = await env.DB.prepare("SELECT coverage_start, coverage_end, last_synced_at, note FROM source_coverage WHERE user_id=? AND source='github'").bind(userId).first<{ coverage_start: string; coverage_end: string; last_synced_at: string; note: string }>();
    if (coverage && githubReceiptWindow(coverage, now).fresh && now - Date.parse(coverage.last_synced_at) < 6 * 60 * 60_000) return null;
  }
  const record = await env.DB.prepare('SELECT github_login, github_token_ciphertext, storage_mode FROM users WHERE id=?').bind(userId).first<{ github_login: string; github_token_ciphertext: string | null; storage_mode: string }>();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!record?.github_login || !record.github_token_ciphertext || !secret) throw new GitHubRefreshError('Reconnect GitHub before syncing.', 409);
  const { token } = await openJson<{ token: string }>(record.github_token_ciphertext, secret);
  const snapshot = await collectGitHubContributions(token, record.github_login);
  if (record.storage_mode === 'github') {
    const generatedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const aggregate = { schemaVersion: githubContributionSchema, id, generatedAt, windowDays: githubContributionWindowDays, ...snapshot };
    const stored = await persistGithubSnapshot(userId, `github/${generatedAt.slice(0, 7).replace('-', '/')}/${id}.json`, { ...aggregate, signature: await hmac(canonicalJson(aggregate), secret) });
    if (!stored) throw new GitHubRefreshError('GitHub-backed storage is not connected. Reconnect storage before refreshing receipts.', 502);
  }
  await storeGitHubContributions(userId, snapshot);
  return snapshot;
}

export async function refreshGitHubAfterUpload(userId: string) {
  try {
    await refreshGitHubContributions(userId, { onlyIfStale: true });
  } catch {
    // Preserve the last dated snapshot; a failed receipt refresh must not discard a successful coding upload.
    console.warn('Automatic contribution refresh failed; existing receipts were preserved.');
  }
}
