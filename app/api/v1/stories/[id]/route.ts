import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { currentGitHubUser } from '../../../../../lib/auth';
import { authenticateDevice } from '../../../../../lib/device-auth';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { const [device, user] = await Promise.all([authenticateDevice(request), currentGitHubUser()]); const userId = device?.userId ?? user?.userId; if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); const { id } = await params; const result = await env.DB.prepare(`UPDATE session_stories SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL`).bind(new Date().toISOString(), id, userId).run(); return result.meta.changes ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Story not found.' }, { status: 404 }); }
