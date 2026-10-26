import { runtimeEnv as env } from './runtime-env';
import { ensureDb } from '../db/ensure';
import { openJson } from './crypto';

type StorageRecord = { github_login: string; github_token_ciphertext: string; repo_ciphertext: string; scopes: string };

async function record(userId: string): Promise<{ login: string; token: string; repo: string; scopes: string } | null> {
  await ensureDb();
  const row = await env.DB.prepare(`SELECT u.github_login,u.github_token_ciphertext,s.repo_ciphertext,s.scopes FROM users u JOIN github_storage s ON s.user_id=u.id WHERE u.id=? AND s.repo_ciphertext IS NOT NULL`).bind(userId).first<StorageRecord>();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!row) return null;
  if (!secret) throw new Error('Storage encryption is not configured.');
  const [{ token }, { repo }] = await Promise.all([openJson<{ token: string }>(row.github_token_ciphertext, secret), openJson<{ repo: string }>(row.repo_ciphertext, secret)]);
  return { login: row.github_login, token, repo, scopes: row.scopes };
}

export async function persistGithubSnapshot(userId: string, path: string, value: unknown): Promise<boolean> {
  const storage = await record(userId);
  if (!storage) return false;
  const content = btoa(unescape(encodeURIComponent(`${JSON.stringify(value, null, 2)}\n`)));
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(storage.login)}/${encodeURIComponent(storage.repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${storage.token}`, 'content-type': 'application/json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ai-native-profile' }, body: JSON.stringify({ message: `Store activity snapshot ${path.split('/').at(-1)}`, content }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`GitHub-backed snapshot failed (${response.status}).`);
  return true;
}

export async function removeGithubImportSnapshots(userId: string, source: 'chatgpt_web' | 'claude_web'): Promise<number> {
  const storage = await record(userId);
  if (!storage) {
    const user = await env.DB.prepare('SELECT storage_mode FROM users WHERE id=?').bind(userId).first<{ storage_mode: string }>();
    if (user?.storage_mode === 'github') throw new Error('Reconnect GitHub storage before removing imported data.');
    return 0;
  }
  const base = `https://api.github.com/repos/${encodeURIComponent(storage.login)}/${encodeURIComponent(storage.repo)}`;
  async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${storage!.token}`, 'content-type': 'application/json', 'x-github-api-version': '2022-11-28', 'user-agent': 'tokpop' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`GitHub snapshot removal failed (${response.status}). Reconnect storage if needed, then retry.`);
    return response.json() as Promise<T>;
  }
  const repo = await api<{ default_branch: string }>('');
  const ref = `heads/${repo.default_branch.split('/').map(encodeURIComponent).join('/')}`;
  const head = await api<{ object: { sha: string } }>(`/git/ref/${ref}`);
  const commit = await api<{ tree: { sha: string } }>(`/git/commits/${head.object.sha}`);
  const tree = await api<{ truncated: boolean; tree: Array<{ path: string; type: string; sha: string }> }>(`/git/trees/${commit.tree.sha}?recursive=1`);
  if (tree.truncated) throw new Error('GitHub returned an incomplete file list. No snapshots were removed. Contact support before retrying.');
  const candidates = tree.tree.filter((entry) => entry.type === 'blob' && /^imports\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.json$/i.test(entry.path));
  if (candidates.length > 200) throw new Error('This repository has too many import snapshots to remove in one request. No snapshots were removed. Contact support.');
  const paths: string[] = [];
  for (let index = 0; index < candidates.length; index += 5) {
    await Promise.all(candidates.slice(index, index + 5).map(async (entry) => {
      const blob = await api<{ encoding: string; content: string }>(`/git/blobs/${entry.sha}`);
      if (blob.encoding !== 'base64') throw new Error('A snapshot could not be read. No snapshots were removed.');
      const value = JSON.parse(Buffer.from(blob.content, 'base64').toString('utf8'));
      if (value?.schemaVersion === 'anp.web-import.v1' && value.source === source) paths.push(entry.path);
    }));
  }
  if (!paths.length) return 0;
  const replacement = await api<{ sha: string }>('/git/trees', 'POST', { base_tree: commit.tree.sha, tree: paths.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })) });
  const removal = await api<{ sha: string }>('/git/commits', 'POST', { message: 'Remove imported conversation snapshots', tree: replacement.sha, parents: [head.object.sha] });
  // A non-fast-forward update fails if another writer changed the branch. Never rewrite history.
  await api(`/git/refs/${ref}`, 'PATCH', { sha: removal.sha, force: false });
  return paths.length;
}
