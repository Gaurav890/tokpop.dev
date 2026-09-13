import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { currentGitHubUser } from '../../../../lib/auth';

export async function GET() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureDb();
  const settings = await env.DB.prepare(`SELECT u.public_enabled,u.leaderboard_enabled,u.conversation_enabled,u.storage_mode,coalesce(c.enabled,0) AS comparison_enabled FROM users u LEFT JOIN comparison_optins c ON c.user_id=u.id WHERE u.id=?`).bind(user.userId).first();
  return NextResponse.json({ settings }, { headers: { 'cache-control': 'private, no-store' } });
}

export async function PATCH(request: NextRequest) { const user = await currentGitHubUser(); if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); const body = await request.json().catch(() => ({})) as Record<string, unknown>; const storageMode = body.storageMode === 'github' ? 'github' : 'managed'; const publicEnabled = Boolean(body.publicEnabled); const leaderboardEnabled = publicEnabled && Boolean(body.leaderboardEnabled); const comparisonEnabled = publicEnabled && Boolean(body.comparisonEnabled); await ensureDb(); if (storageMode === 'github' && !(await env.DB.prepare('SELECT user_id FROM github_storage WHERE user_id=? AND repo_ciphertext IS NOT NULL').bind(user.userId).first())) return NextResponse.json({ error: 'Configure a private GitHub repository before enabling GitHub-backed storage.' }, { status: 409 }); const now = new Date().toISOString(); await env.DB.batch([env.DB.prepare(`UPDATE users SET public_enabled=?,leaderboard_enabled=?,conversation_enabled=?,storage_mode=?,updated_at=? WHERE id=?`).bind(publicEnabled ? 1 : 0, leaderboardEnabled ? 1 : 0, Boolean(body.conversationEnabled) ? 1 : 0, storageMode, now, user.userId), env.DB.prepare(`INSERT INTO comparison_optins (user_id,enabled,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at`).bind(user.userId, comparisonEnabled ? 1 : 0, now)]); return NextResponse.json({ ok: true }); }
