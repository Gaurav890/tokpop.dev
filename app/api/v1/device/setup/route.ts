import { NextRequest, NextResponse } from 'next/server';
import { runtimeEnv as env } from '@/lib/runtime-env';
import { currentGitHubUser } from '../../../../../lib/auth';
import { ensureDb } from '../../../../../db/ensure';
import { hasCardActivity, readSetupAttempt, setupProgress } from '../../../../../lib/setup-progress';
import { getPrivateProfile } from '../../../../../lib/profile';

export async function GET(request: NextRequest) {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Sign in to resume setup.' }, { status: 401 });
  const id = readSetupAttempt(request.nextUrl.searchParams.get('deviceId'));
  if (!id) return NextResponse.json({ error: 'Invalid setup attempt.' }, { status: 400 });
  await ensureDb();
  const device = await env.DB.prepare('SELECT id,status,token_delivered,expires_at,last_seen_at,setup_receipt_json FROM devices WHERE id=? AND user_id=?')
    .bind(id, user.userId).first<{ id: string; status: string; token_delivered: number; expires_at: string; last_seen_at: string | null; setup_receipt_json: string | null }>();
  if (!device) return NextResponse.json({ error: 'Setup attempt not found for this account.' }, { status: 404 });
  const progress = setupProgress(device);
  if (progress.stage === 'imported' && !hasCardActivity(await getPrivateProfile(user.userId))) progress.stage = 'limited';
  return NextResponse.json(progress, { headers: { 'cache-control': 'private, no-store' } });
}
