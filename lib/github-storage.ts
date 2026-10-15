import { runtimeEnv as env } from './runtime-env';
import { ensureDb } from '../db/ensure';
import { openJson } from './crypto';

type StorageRecord = { github_login: string; github_token_ciphertext: string; repo_ciphertext: string; scopes: string };

async function record(userId: string): Promise<{ login: string; token: string; repo: string; scopes: string } | null> {
  await ensureDb();
  const row = await env.DB.prepare(`SELECT u.github_login,u.github_token_ciphertext,s.repo_ciphertext,s.scopes FROM users u JOIN github_storage s ON s.user_id=u.id WHERE u.id=? AND s.repo_ciphertext IS NOT NULL`).bind(userId).first<StorageRecord>();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!row || !secret) return null;
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
