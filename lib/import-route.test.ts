import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ user: vi.fn(), first: vi.fn(), batch: vi.fn(), backup: vi.fn(), remove: vi.fn(), statements: [] as Array<{ sql: string; values: unknown[] }> }));
vi.mock('./auth', () => ({ currentGitHubUser: mocks.user }));
vi.mock('../db/ensure', () => ({ ensureDb: vi.fn() }));
vi.mock('./runtime-env', () => ({ runtimeEnv: { SESSION_SECRET: 'test', DB: { prepare: (sql: string) => ({ bind: (...values: unknown[]) => { const query = { sql, values, first: mocks.first }; mocks.statements.push(query); return query; } }), batch: mocks.batch } } }));
vi.mock('./github-storage', () => ({ persistGithubSnapshot: mocks.backup, removeGithubImportSnapshots: mocks.remove }));
vi.mock('./crypto', () => ({ canonicalJson: JSON.stringify, hmac: async () => 'test-signature' }));
import { DELETE, POST } from '../app/api/v1/imports/aggregate/route';

function request(body: unknown, method = 'DELETE', headers = {}) {
  return new NextRequest('https://tokpop.dev/api/v1/imports/aggregate', { method, headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.statements.length = 0;
  mocks.user.mockResolvedValue({ userId: 'owner' });
  mocks.first.mockResolvedValue({ storage_mode: 'managed' });
  mocks.backup.mockResolvedValue(true);
  mocks.remove.mockResolvedValue(2);
});

describe('remove imported data', () => {
  it('requires authentication and explicit confirmation for a supported source', async () => {
    mocks.user.mockResolvedValueOnce(null);
    expect((await DELETE(request({ source: 'claude_web', confirm: true }))).status).toBe(401);
    for (const body of [{ source: 'claude_code', confirm: true }, { source: 'claude_web' }, null]) expect((await DELETE(request(body))).status).toBe(400);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rejects cross-site requests before touching data', async () => {
    expect((await DELETE(request({ source: 'claude_web', confirm: true }, 'DELETE', { 'sec-fetch-site': 'cross-site' }))).status).toBe(403);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each(['claude_web', 'chatgpt_web'])('scopes removal to the authenticated user and %s official exports', async (source) => {
    expect((await DELETE(request({ source, confirm: true, userId: 'someone-else' }))).status).toBe(200);
    expect(mocks.remove).toHaveBeenCalledWith('owner', source);
    expect(mocks.batch).toHaveBeenCalledOnce();
    expect(mocks.statements[0]).toMatchObject({ sql: "DELETE FROM daily_metrics WHERE user_id=? AND source=? AND provenance='official_export'", values: ['owner', source] });
    expect(mocks.statements[1].sql).toContain('NOT EXISTS');
    expect(mocks.statements[2].sql).toContain("completeness='partial'");
    expect(mocks.statements.every((query) => query.values.every((value) => value === 'owner' || value === source))).toBe(true);
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.batch.mock.invocationCallOrder[0]);
  });
  it('preserves database data if GitHub cleanup fails', async () => {
    mocks.remove.mockRejectedValueOnce(new Error('GitHub unavailable'));
    expect((await DELETE(request({ source: 'claude_web', confirm: true }))).status).toBe(502);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
  it('reports a retryable database failure after snapshot cleanup', async () => {
    mocks.batch.mockRejectedValueOnce(new Error('DB unavailable'));
    const response = await DELETE(request({ source: 'claude_web', confirm: true }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain('Retry removal');
  });
});

describe('import snapshot safety', () => {
  const payload = { source: 'claude_web', coverageStart: '2026-10-25', coverageEnd: '2026-10-25', days: [{ date: '2026-10-25', sessions: 1, turns: 2, content: 'PRIVATE' }], raw: 'PRIVATE', schemaVersion: 'forged' };
  it('allowlists aggregate fields before writing GitHub snapshots', async () => {
    mocks.first.mockResolvedValue({ storage_mode: 'github' });
    expect((await POST(request(payload, 'POST'))).status).toBe(200);
    const snapshot = mocks.backup.mock.calls[0][2];
    expect(snapshot.schemaVersion).toBe('anp.web-import.v1');
    expect(JSON.stringify(snapshot)).not.toContain('PRIVATE');
  });
  it('fails closed if configured GitHub storage is disconnected', async () => {
    mocks.first.mockResolvedValue({ storage_mode: 'github' }); mocks.backup.mockResolvedValue(false);
    expect((await POST(request(payload, 'POST'))).status).toBe(502);
    expect(mocks.batch).not.toHaveBeenCalled();
  });
  it('rejects null rows instead of crashing', async () => {
    expect((await POST(request({ ...payload, days: [null] }, 'POST'))).status).toBe(400);
  });
});
