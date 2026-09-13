import { NextResponse } from 'next/server';
import { currentGitHubUser } from '../../../../../lib/auth';
import { getPrivateProfileFromDatabase } from '../../../../../lib/profile';

export async function GET() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const profile = await getPrivateProfileFromDatabase(user.userId);
  return profile
    ? NextResponse.json(profile, { headers: { 'cache-control': 'private, no-store' } })
    : NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
}
