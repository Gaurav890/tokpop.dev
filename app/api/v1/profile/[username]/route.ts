import { NextResponse } from 'next/server';
import { getPublicProfile } from '../../../../../lib/profile';

export async function GET(_: Request, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await getPublicProfile(username);
  return profile ? NextResponse.json(profile, { headers: { 'cache-control': 'public, max-age=60, s-maxage=900' } }) : NextResponse.json({ error: 'Profile not found or not public.' }, { status: 404 });
}
