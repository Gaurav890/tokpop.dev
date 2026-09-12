import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { currentGitHubUser, sessionCookieName } from '../../../../lib/auth';

export async function DELETE() { const user = await currentGitHubUser(); if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 }); await ensureDb(); await env.DB.prepare('DELETE FROM users WHERE id=?').bind(user.userId).run(); const response = NextResponse.json({ ok: true }); response.cookies.delete(sessionCookieName); return response; }
