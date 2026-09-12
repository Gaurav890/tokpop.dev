import { NextResponse } from 'next/server';
import schema from '../../../packages/schema/activity.schema.json';

export async function GET() {
  return NextResponse.json(schema, { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400', 'access-control-allow-origin': '*' } });
}
