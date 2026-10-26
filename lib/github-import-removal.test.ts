import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ first: vi.fn(), fetch: vi.fn() }));
vi.mock('../db/ensure', () => ({ ensureDb: vi.fn() }));
vi.mock('./runtime-env', () => ({ runtimeEnv: { SESSION_SECRET: 'test', DB: { prepare: () => ({ bind: () => ({ first: mocks.first }) }) } } }));
vi.mock('./crypto', () => ({ openJson: async (value: string) => value === 'token' ? { token: 'private-token' } : { repo: 'private-data' } }));
import { removeGithubImportSnapshots } from './github-storage';

const importPath = (id: string) => `imports/2026/10/${id.repeat(8)}-1234-1234-1234-123456789abc.json`;
const entries = [
  { path: importPath('a'), sha: 'claude', type: 'blob' },
  { path: importPath('b'), sha: 'chatgpt', type: 'blob' },
  { path: importPath('c'), sha: 'different-schema', type: 'blob' },
  { path: 'coding/snapshot.json', sha: 'coding', type: 'blob' },
  { path: 'README.md', sha: 'readme', type: 'blob' },
];
let truncated: boolean;
beforeEach(() => {
  vi.resetAllMocks(); truncated = false;
  mocks.first.mockResolvedValue({ github_login: 'owner', github_token_ciphertext: 'token', repo_ciphertext: 'repo', scopes: 'repo' });
  mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => {
    const path = url.replace('https://api.github.com/repos/owner/private-data', '');
    let value: unknown;
    if (path === '') value = { default_branch: 'main' };
    else if (path === '/git/ref/heads/main' && init.method === 'GET') value = { object: { sha: 'head' } };
    else if (path === '/git/refs/heads/main' && init.method === 'PATCH') value = {};
    else if (path === '/git/commits/head') value = { tree: { sha: 'tree' } };
    else if (path === '/git/trees/tree?recursive=1') value = { truncated, tree: entries };
    else if (path.startsWith('/git/blobs/')) value = { encoding: 'base64', content: Buffer.from(JSON.stringify({ schemaVersion: path.endsWith('different-schema') ? 'other' : 'anp.web-import.v1', source: path.endsWith('chatgpt') ? 'chatgpt_web' : 'claude_web' })).toString('base64') };
    else if (path === '/git/trees') value = { sha: 'new-tree' };
    else if (path === '/git/commits') value = { sha: 'new-commit' };
    else throw new Error(`Unexpected endpoint ${path}`);
    return Response.json(value);
  });
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe('GitHub import snapshot removal', () => {
  it('removes only matching source snapshots in one non-force branch update', async () => {
    expect(await removeGithubImportSnapshots('user', 'claude_web')).toBe(1);
    const writes = mocks.fetch.mock.calls.filter(([, init]) => init.method !== 'GET');
    expect(writes).toHaveLength(3);
    expect(JSON.parse(writes[0][1].body)).toEqual({ base_tree: 'tree', tree: [{ path: importPath('a'), mode: '100644', type: 'blob', sha: null }] });
    expect(JSON.parse(writes[1][1].body).parents).toEqual(['head']);
    expect(JSON.parse(writes[2][1].body)).toEqual({ sha: 'new-commit', force: false });
    expect(mocks.fetch.mock.calls.some(([url]) => url.endsWith('/git/blobs/coding'))).toBe(false);
  });
  it('fails safely on incomplete tree listings before any mutation', async () => {
    truncated = true;
    await expect(removeGithubImportSnapshots('user', 'claude_web')).rejects.toThrow('incomplete');
    expect(mocks.fetch.mock.calls.every(([, init]) => init.method === 'GET')).toBe(true);
  });
  it('does not overwrite a concurrently updated branch', async () => {
    const original = mocks.fetch.getMockImplementation()!;
    mocks.fetch.mockImplementation(async (url: string, init: RequestInit) => init.method === 'PATCH' ? new Response('', { status: 422 }) : original(url, init));
    await expect(removeGithubImportSnapshots('user', 'claude_web')).rejects.toThrow('422');
    expect(mocks.fetch.mock.calls.filter(([, init]) => init.method === 'PATCH')).toHaveLength(1);
  });
  it('needs no GitHub operation for managed-only storage', async () => {
    mocks.first.mockResolvedValueOnce(null).mockResolvedValueOnce({ storage_mode: 'managed' });
    expect(await removeGithubImportSnapshots('user', 'claude_web')).toBe(0);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('fails closed for disconnected GitHub storage', async () => {
    mocks.first.mockResolvedValueOnce(null).mockResolvedValueOnce({ storage_mode: 'github' });
    await expect(removeGithubImportSnapshots('user', 'claude_web')).rejects.toThrow('Reconnect');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
