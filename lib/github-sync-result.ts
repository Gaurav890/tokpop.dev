import type { GitHubContributionSnapshot } from './github-contribution-api';

export type GitHubSyncResult = GitHubContributionSnapshot & { ok: true; windowDays: 90 };

export function parseGitHubSyncResult(value: unknown): GitHubSyncResult {
  const result = value as Partial<GitHubSyncResult> | null;
  const counts = [result?.commits, result?.pullRequests, result?.reviews, result?.privateContributions, result?.totalContributions, result?.activeDays];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const validDates = typeof result?.coverageStart === 'string' && typeof result?.coverageEnd === 'string'
    && datePattern.test(result.coverageStart) && datePattern.test(result.coverageEnd)
    && Date.parse(`${result.coverageEnd}T00:00:00Z`) - Date.parse(`${result.coverageStart}T00:00:00Z`) === 89 * 86_400_000;
  if (result?.ok !== true || result.windowDays !== 90 || !validDates || counts.some((count) => typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)) {
    throw new Error('GitHub receipts are temporarily unavailable while the service updates. Your saved card is unchanged.');
  }
  return result as GitHubSyncResult;
}

export async function requestGitHubProof(fetcher: typeof fetch = fetch): Promise<GitHubSyncResult> {
  const response = await fetcher('/api/v1/github/sync', { method: 'POST', signal: AbortSignal.timeout(25000) });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : 'GitHub receipts could not refresh. Your saved card is unchanged.';
    throw new Error(message);
  }
  return parseGitHubSyncResult(body);
}
