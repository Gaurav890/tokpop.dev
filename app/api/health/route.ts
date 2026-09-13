import { NextResponse } from 'next/server';
import { ensureDb } from '@/db/ensure';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDb();
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error instanceof Error ? error.message : 'Database connection failed.' },
      { status: 503 },
    );
  }
}
