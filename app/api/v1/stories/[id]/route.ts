import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { currentGitHubUser } from '../../../../../lib/auth';
import { authenticateDevice } from '../../../../../lib/device-auth';
import { ensureDb } from '../../../../../db/ensure';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await ensureDb();
  const story = await env.DB.prepare(`SELECT s.id,s.source,s.title,s.summary,s.tags_json,s.visibility,s.expires_at,s.created_at,u.github_login,u.display_name FROM session_stories s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.revoked_at IS NULL LIMIT 1`).bind(id).first();
  if (!story || (story.expires_at && String(story.expires_at) <= new Date().toISOString())) return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
  return NextResponse.json({ story }, { headers: { 'cache-control': story.visibility === 'public' ? 'public, max-age=60, s-maxage=300' : 'private, no-store' } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const [device, user] = await Promise.all([authenticateDevice(request), currentGitHubUser()]); const userId = device?.userId ?? user?.userId; if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); const { id } = await params; const result = await env.DB.prepare(`UPDATE session_stories SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL`).bind(new Date().toISOString(), id, userId).run(); return result.meta.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Story not found.' }, { status: 404 }); }
