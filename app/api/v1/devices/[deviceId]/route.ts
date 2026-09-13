import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';
import { currentGitHubUser } from '../../../../../lib/auth';

export async function DELETE(_: Request, { params }: { params: Promise<{ deviceId: string }> }) { const user = await currentGitHubUser(); if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); const { deviceId } = await params; await ensureDb(); const result = await env.DB.prepare(`UPDATE devices SET status='revoked',device_token_hash=NULL WHERE id=? AND user_id=?`).bind(deviceId, user.userId).run(); if (!result.meta.changes) return NextResponse.json({ error: 'Device not found.' }, { status: 404 }); return NextResponse.json({ ok: true }); }
