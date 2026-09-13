import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { openJson, sealJson } from '../../../../../lib/crypto';

export async function POST(request: NextRequest) {
  const user = await currentGitHubUser(); if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { repo?: string };
  const repo = String(body.repo ?? 'ai-native-profile-data').trim();
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(repo)) return NextResponse.json({ error: 'Repository name may contain letters, numbers, dots, dashes, and underscores.' }, { status: 400 });
  await ensureDb();
  const row = await env.DB.prepare(`SELECT u.github_token_ciphertext,s.scopes FROM users u LEFT JOIN github_storage s ON s.user_id=u.id WHERE u.id=?`).bind(user.userId).first<{ github_token_ciphertext: string; scopes: string | null }>();
  if (!row?.scopes?.split(/[ ,]+/).includes('repo')) return NextResponse.json({ error: 'GitHub repository permission is required.', authorizeUrl: '/api/auth/github/start?scope=repo&return_to=/settings/privacy' }, { status: 403 });
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET; if (!secret) return NextResponse.json({ error: 'Storage encryption is not configured.' }, { status: 503 });
  const { token } = await openJson<{ token: string }>(row.github_token_ciphertext, secret);
  const lookup = await fetch(`https://api.github.com/repos/${encodeURIComponent(user.login)}/${encodeURIComponent(repo)}`, { headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'x-github-api-version': '2022-11-28', 'user-agent': 'ai-native-profile' } });
  if (lookup.status === 404) {
    const created = await fetch('https://api.github.com/user/repos', { method: 'POST', headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-github-api-version': '2022-11-28', 'user-agent': 'ai-native-profile' }, body: JSON.stringify({ name: repo, private: true, auto_init: true, description: 'Private signed activity snapshots for AI Native Profile' }) });
    if (!created.ok) return NextResponse.json({ error: `Private repository creation failed (${created.status}).` }, { status: 502 });
  } else if (!lookup.ok) return NextResponse.json({ error: `Repository lookup failed (${lookup.status}).` }, { status: 502 });
  await env.DB.prepare(`INSERT INTO github_storage (user_id,repo_ciphertext,scopes,configured_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET repo_ciphertext=excluded.repo_ciphertext,configured_at=excluded.configured_at`).bind(user.userId, await sealJson({ repo }, secret), row.scopes, new Date().toISOString()).run();
  return NextResponse.json({ ok: true, repo });
}
