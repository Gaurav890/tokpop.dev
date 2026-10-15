import { describe, expect, it, vi } from 'vitest';
import { collectGitHubContributions } from './github-contribution-api';

describe('collectGitHubContributions', () => {
  it('rejects partial successful responses instead of manufacturing zero totals', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ data: { user: { contributionsCollection: { totalCommitContributions: 1, contributionCalendar: { totalContributions: 1, weeks: [] } } } } })));
    await expect(collectGitHubContributions('test-token', 'demo', { fetch: request as typeof fetch })).rejects.toThrow('incomplete');
  });
  it('uses a bounded uncached request and preserves the previous snapshot on network failures', async () => {
    const request = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.cache).toBe('no-store');
      throw new Error('Network unavailable');
    });
    await expect(collectGitHubContributions('test-token', 'demo', { fetch: request as typeof fetch })).rejects.toThrow('Network unavailable');
  });
  it('reads exact account totals for the latest 90 calendar days', async () => {
    const request = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({
      data: {
        user: {
          contributionsCollection: {
            totalCommitContributions: 191,
            totalPullRequestContributions: 78,
            totalPullRequestReviewContributions: 4,
            restrictedContributionsCount: 160,
            contributionCalendar: {
              totalContributions: 476,
              weeks: [{ contributionDays: [{ contributionCount: 0 }, { contributionCount: 3 }, { contributionCount: 1 }] }],
            },
          },
        },
      },
    }), { status: 200 }));

    const snapshot = await collectGitHubContributions('secret-token', 'Gaurav890', {
      now: new Date('2026-09-24T21:30:00.000Z'),
      fetch: request as unknown as typeof fetch,
    });

    expect(snapshot).toEqual({
      coverageStart: '2026-06-27',
      coverageEnd: '2026-09-24',
      commits: 191,
      pullRequests: 78,
      reviews: 4,
      privateContributions: 160,
      totalContributions: 476,
      activeDays: 2,
    });
    const [url, options] = request.mock.calls[0];
    expect(url).toBe('https://api.github.com/graphql');
    expect(options?.headers).toMatchObject({ authorization: 'Bearer secret-token' });
    expect(JSON.parse(String(options?.body)).variables).toEqual({
      login: 'Gaurav890',
      from: '2026-06-27T00:00:00.000Z',
      to: '2026-09-24T21:30:00.000Z',
    });
  });

  it('surfaces GitHub GraphQL errors instead of storing zeros', async () => {
    const request = vi.fn<(input: string | URL | Request, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ errors: [{ message: 'Bad credentials' }] }), { status: 200 }));
    await expect(collectGitHubContributions('bad-token', 'octocat', { fetch: request as unknown as typeof fetch })).rejects.toThrow('Bad credentials');
  });
});
