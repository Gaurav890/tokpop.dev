import { NextRequest, NextResponse } from 'next/server';
import { renderBadge, renderProfileCard, renderSocialCard } from '@ai-native-profile/renderers';
import { getPublicProfile } from '../../../../../lib/profile';

export async function GET(request: NextRequest, context: { params: Promise<{ username: string }> }) {
  const { username } = await context.params;
  const profile = await getPublicProfile(username);
  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  const theme = request.nextUrl.searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  const card = { username: profile.username, score: profile.scoreEligible ? profile.score : null, activeDays: profile.activeDays, streakDays: profile.currentStreak, providers: profile.providers, updatedAt: profile.updatedAt };
  const format = request.nextUrl.searchParams.get('format');
  const svg = format === 'badge' ? renderBadge(card.score) : format === 'og' || format === 'square' || format === 'story' ? renderSocialCard(card, format, theme) : renderProfileCard(card, theme);
  return new NextResponse(svg, { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=900', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'" } });
}
