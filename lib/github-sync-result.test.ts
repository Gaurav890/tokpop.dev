import { describe, expect, it, vi } from 'vitest';
import { parseGitHubSyncResult, requestGitHubProof } from './github-sync-result';

const snapshot = { ok: true, windowDays: 90, coverageStart: '2026-07-18', coverageEnd: '2026-10-15', commits: 191, pullRequests: 78, reviews: 0, privateContributions: 160, totalContributions: 429, activeDays: 55 };

describe('GitHub contribution response contract', () => {
  it('accepts complete contribution counts, including measured zero', () => {
    expect(parseGitHubSyncResult(snapshot).reviews).toBe(0);
    expect(parseGitHubSyncResult(snapshot).commits).toBe(191);
  });
  it.each([null, {}, { ok: true, events: 12, activeDays: 4 }, { ...snapshot, commits: undefined }, { ...snapshot, pullRequests: '78' }, { ...snapshot, reviews: -1 }, { ...snapshot, coverageEnd: 'invalid' }, { ...snapshot, windowDays: 30 }])('rejects absent, legacy, or incomplete data instead of inventing zeros', (body) => {
    expect(() => parseGitHubSyncResult(body)).toThrow('while the service updates');
  });
  it('does not mistake a legacy HTTP 200 for successful contribution refresh', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true, events: 83 }));
    await expect(requestGitHubProof(fetcher)).rejects.toThrow('saved card is unchanged');
  });
  it('rejects invalid JSON even with a successful HTTP status', async () => {
    await expect(requestGitHubProof(vi.fn().mockResolvedValue(new Response('not json')))).rejects.toThrow('while the service updates');
  });
  it('preserves a useful authentication error', async () => {
    await expect(requestGitHubProof(vi.fn().mockResolvedValue(Response.json({ error: 'Reconnect GitHub before syncing.' }, { status: 409 })))).rejects.toThrow('Reconnect GitHub');
  });
});
