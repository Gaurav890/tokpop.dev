import type { PublicProfile } from './demo-profile';

export type LeaderboardEntry = {
  username: string;
  name: string;
  score: number;
  providers: number;
  delivery: number;
  activeDays: number;
  rank: number;
};

export function rankLeaderboardProfiles(profiles: Array<PublicProfile | null>): LeaderboardEntry[] {
  return profiles
    .filter((profile): profile is PublicProfile => Boolean(profile?.publicEnabled && profile.scoreEligible))
    .sort((left, right) => right.score - left.score || right.deliveryPoints - left.deliveryPoints || right.activeDays - left.activeDays || left.username.localeCompare(right.username))
    .map((profile, index) => ({
      username: profile.username,
      name: profile.name,
      score: profile.score,
      providers: profile.providers.length,
      delivery: profile.deliveryPoints,
      activeDays: profile.activeDays,
      rank: index + 1,
    }));
}
