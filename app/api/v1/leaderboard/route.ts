import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { getPublicProfileFromDatabase } from '../../../../lib/profile';
import { rankLeaderboardProfiles } from '../../../../lib/leaderboard';

export async function GET() {
  await ensureDb();
  const result = await env.DB.prepare(`SELECT github_login FROM users WHERE public_enabled=1 AND leaderboard_enabled=1 ORDER BY updated_at DESC LIMIT 100`).all<{ github_login: string }>();
  const profiles = await Promise.all((result.results ?? []).map((user) => getPublicProfileFromDatabase(user.github_login)));
  return NextResponse.json({ profiles: rankLeaderboardProfiles(profiles) }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
}
