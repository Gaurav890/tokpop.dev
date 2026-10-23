import { NextResponse } from 'next/server';
import { runtimeEnv as env } from '@/lib/runtime-env';
import { currentGitHubUser } from '../../../../../lib/auth';
import { ensureDb } from '../../../../../db/ensure';
import { openJson } from '../../../../../lib/crypto';
import { readmeDestination } from '../../../../../lib/readme-destination';

export async function GET() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error:'Sign in to check your profile README.' }, { status:401 });
  await ensureDb();
  const row = await env.DB.prepare('SELECT github_token_ciphertext FROM users WHERE id=?').bind(user.userId).first<{ github_token_ciphertext: string | null }>();
  let token: string | undefined;
  try { if (row?.github_token_ciphertext && env.SESSION_SECRET) token = (await openJson<{ token: string }>(row.github_token_ciphertext, env.SESSION_SECRET)).token; } catch { /* Public repository lookup remains available. */ }
  return NextResponse.json(await readmeDestination(user.login, token), { headers:{ 'cache-control':'private, no-store' } });
}
