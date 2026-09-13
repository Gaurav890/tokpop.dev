import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';

export async function GET() {
  await ensureDb();
  const result = await env.DB.prepare(`SELECT github_login,display_name FROM users WHERE public_enabled=1 AND leaderboard_enabled=1 ORDER BY updated_at DESC LIMIT 100`).all();
  return NextResponse.json({ users: result.results ?? [] }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
}
