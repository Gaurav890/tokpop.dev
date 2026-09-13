import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../../db/ensure';

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (username === 'demo' || username === 'gaurav') return NextResponse.json({ eligible: true });
  await ensureDb();
  const eligible = Boolean(await env.DB.prepare(`SELECT 1 FROM users u JOIN comparison_optins c ON c.user_id=u.id WHERE lower(u.github_login)=lower(?) AND u.public_enabled=1 AND c.enabled=1`).bind(username).first());
  return NextResponse.json({ eligible }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } });
}
