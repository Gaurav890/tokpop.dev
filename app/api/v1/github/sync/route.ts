import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';
import { canonicalJson, hmac, openJson } from '../../../../../lib/crypto';
import {
  collectGitHubContributions,
  githubContributionSchema,
  githubContributionWindowDays,
  storeGitHubContributions,
} from '../../../../../lib/github-contributions';
import { persistGithubSnapshot } from '../../../../../lib/github-storage';

export async function POST() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureDb();
  const record = await env.DB.prepare('SELECT github_token_ciphertext, storage_mode FROM users WHERE id=?').bind(user.userId).first<{ github_token_ciphertext: string | null; storage_mode: string }>();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!record?.github_token_ciphertext || !secret) return NextResponse.json({ error: 'Reconnect GitHub before syncing.' }, { status: 409 });
  const { token } = await openJson<{ token: string }>(record.github_token_ciphertext, secret);
  let snapshot;
  try {
    snapshot = await collectGitHubContributions(token, user.login);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub contribution lookup failed.' }, { status: 502 });
  }

  if (record.storage_mode === 'github') {
    const generatedAt = new Date().toISOString();
    const id = crypto.randomUUID();
    const aggregate = { schemaVersion: githubContributionSchema, id, generatedAt, windowDays: githubContributionWindowDays, ...snapshot };
    try {
      await persistGithubSnapshot(user.userId, `github/${generatedAt.slice(0, 7).replace('-', '/')}/${id}.json`, { ...aggregate, signature: await hmac(canonicalJson(aggregate), secret) });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'GitHub-backed snapshot failed.' }, { status: 502 });
    }
  }

  await storeGitHubContributions(user.userId, snapshot);
  return NextResponse.json({ ok: true, windowDays: githubContributionWindowDays, ...snapshot });
}
