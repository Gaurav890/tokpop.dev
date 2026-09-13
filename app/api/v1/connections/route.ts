import { runtimeEnv as env } from '@/lib/runtime-env';
import { NextResponse } from 'next/server';
import { ensureDb } from '../../../../db/ensure';
import { currentGitHubUser } from '../../../../lib/auth';

export async function GET() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  await ensureDb();
  const [coverageResult, deviceResult] = await Promise.all([
    env.DB.prepare(`SELECT sc.source,sc.coverage_start,sc.coverage_end,sc.last_synced_at,sc.completeness,sc.competitive_eligible,sc.note,
      (SELECT dm.provenance FROM daily_metrics dm WHERE dm.user_id=sc.user_id AND dm.source=sc.source ORDER BY dm.date DESC LIMIT 1) AS provenance
      FROM source_coverage sc WHERE sc.user_id=? ORDER BY sc.source`).bind(user.userId).all(),
    env.DB.prepare(`SELECT count(*) AS count FROM devices WHERE user_id=? AND status='approved'`).bind(user.userId).first<{ count: number }>(),
  ]);
  return NextResponse.json(
    { coverage: coverageResult.results ?? [], approvedDevices: deviceResult?.count ?? 0 },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
