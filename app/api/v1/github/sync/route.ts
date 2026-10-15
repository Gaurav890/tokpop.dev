import { NextResponse } from 'next/server';
import { currentGitHubUser } from '../../../../../lib/auth';
import { githubContributionWindowDays } from '../../../../../lib/github-contributions';
import { GitHubRefreshError, refreshGitHubContributions } from '../../../../../lib/github-refresh';

export async function POST() {
  const user = await currentGitHubUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  try {
    const snapshot = await refreshGitHubContributions(user.userId);
    return NextResponse.json({ ok: true, windowDays: githubContributionWindowDays, ...snapshot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof GitHubRefreshError ? error.message : 'GitHub contribution refresh failed. Existing receipts were preserved; try again or reconnect GitHub.' }, { status: error instanceof GitHubRefreshError ? error.status : 502 });
  }
}
