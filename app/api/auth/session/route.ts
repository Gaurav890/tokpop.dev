import { NextResponse } from 'next/server';
import { currentGitHubUser } from '../../../../lib/auth';

export async function GET() {
  const user = await currentGitHubUser();
  return NextResponse.json({ authenticated: Boolean(user), user });
}
