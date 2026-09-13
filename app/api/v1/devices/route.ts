import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { currentGitHubUser } from '../../../../lib/auth';

export async function GET() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureDb();
  const result = await env.DB.prepare(`SELECT id,name,status,last_seen_at AS "lastSeenAt",created_at AS "createdAt" FROM devices WHERE user_id=? ORDER BY created_at DESC`).bind(user.userId).all();
  return NextResponse.json({ devices: result.results ?? [] }, { headers: { 'cache-control': 'private, no-store' } });
}
