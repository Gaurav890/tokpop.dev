import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), lookup: vi.fn(), collect: vi.fn(), store: vi.fn(), backup: vi.fn() }));
vi.mock('./auth', () => ({ currentGitHubUser: mocks.user }));
vi.mock('../db/ensure', () => ({ ensureDb: vi.fn() }));
vi.mock('./runtime-env', () => ({ runtimeEnv: { SESSION_SECRET: 'test', DB: { prepare: () => ({ bind: () => ({ first: mocks.lookup }) }) } } }));
vi.mock('./crypto', () => ({ openJson: async () => ({ token: 'test-token' }), canonicalJson: JSON.stringify, hmac: async () => 'test-signature' }));
vi.mock('./github-contributions', () => ({ collectGitHubContributions: mocks.collect, storeGitHubContributions: mocks.store, githubContributionSchema: 'anp.github-contributions.v2', githubContributionWindowDays: 90 }));
vi.mock('./github-storage', () => ({ persistGithubSnapshot: mocks.backup }));
import { POST } from '../app/api/v1/github/sync/route';
import { refreshGitHubAfterUpload, refreshGitHubContributions } from './github-refresh';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ userId: 'test', login: 'demo' });
  mocks.lookup.mockResolvedValue({ github_login: 'demo', github_token_ciphertext: 'cipher', storage_mode: 'github' });
  mocks.collect.mockResolvedValue({ coverageStart: '2026-07-17', coverageEnd: '2026-10-14', commits: 12, pullRequests: 4, reviews: 2, privateContributions: 8 });
  mocks.backup.mockResolvedValue(true);
});
describe('contribution refresh persistence', () => {
  it('requires sign-in', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await POST()).status).toBe(401);
    expect(mocks.collect).not.toHaveBeenCalled();
  });
  it('preserves existing metrics when collection fails', async () => {
    mocks.collect.mockRejectedValueOnce(new Error('Rate limited'));
    expect((await POST()).status).toBe(502);
    expect(mocks.store).not.toHaveBeenCalled();
    expect(mocks.backup).not.toHaveBeenCalled();
  });
  it('does not write managed rows if required backup is disconnected', async () => {
    mocks.backup.mockResolvedValue(false);
    expect((await POST()).status).toBe(502);
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it('does not write managed rows if required backup fails', async () => {
    mocks.backup.mockRejectedValueOnce(new Error('Backup failed'));
    expect((await POST()).status).toBe(502);
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it('writes the signed backup before replacing the current receipt snapshot', async () => {
    expect((await POST()).status).toBe(200);
    expect(mocks.backup.mock.invocationCallOrder[0]).toBeLessThan(mocks.store.mock.invocationCallOrder[0]);
    expect(mocks.backup.mock.calls[0][2]).toMatchObject({ signature: 'test-signature', schemaVersion: 'anp.github-contributions.v2' });
  });
  it('does not create repository files in managed storage mode', async () => {
    mocks.lookup.mockResolvedValue({ github_login: 'demo', github_token_ciphertext: 'cipher', storage_mode: 'managed' });
    expect((await POST()).status).toBe(200);
    expect(mocks.backup).not.toHaveBeenCalled();
    expect(mocks.store).toHaveBeenCalledOnce();
  });
  it('reuses a verified recent snapshot for automatic uploads', async () => {
    mocks.lookup.mockResolvedValueOnce({ coverage_start: '2026-07-17', coverage_end: '2026-10-14', last_synced_at: '2026-10-14T08:00:00Z', note: 'anp.github-contributions.v2: verified' });
    expect(await refreshGitHubContributions('test', { onlyIfStale: true, now: Date.parse('2026-10-14T09:00:00Z') })).toBeNull();
    expect(mocks.collect).not.toHaveBeenCalled();
  });
  it('refreshes after six hours even while the current receipt is still eligible', async () => {
    mocks.lookup.mockResolvedValueOnce({ coverage_start: '2026-07-17', coverage_end: '2026-10-14', last_synced_at: '2026-10-14T01:00:00Z', note: 'anp.github-contributions.v2: verified' });
    await refreshGitHubContributions('test', { onlyIfStale: true, now: Date.parse('2026-10-14T09:00:00Z') });
    expect(mocks.collect).toHaveBeenCalledWith('test-token', 'demo');
    expect(mocks.store).toHaveBeenCalledOnce();
  });
  it('does not treat a recent legacy events snapshot as fresh receipts', async () => {
    mocks.lookup.mockResolvedValueOnce({ coverage_start: '2026-07-17', coverage_end: '2026-10-14', last_synced_at: '2026-10-14T08:00:00Z', note: 'Events API' });
    await refreshGitHubContributions('test', { onlyIfStale: true, now: Date.parse('2026-10-14T09:00:00Z') });
    expect(mocks.collect).toHaveBeenCalledOnce();
  });
  it('keeps a failed optional refresh from failing the coding upload', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.lookup.mockResolvedValueOnce(null);
    mocks.collect.mockRejectedValueOnce(new Error('Rate limited'));
    await expect(refreshGitHubAfterUpload('test')).resolves.toBeUndefined();
    expect(mocks.store).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledOnce();
    warning.mockRestore();
  });
});
