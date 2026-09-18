import { describe, expect, it } from 'vitest';
import { demoProfile } from './demo-profile';
import { rankLeaderboardProfiles } from './leaderboard';

describe('leaderboard ranking', () => {
  it('includes only public profiles with eligible scores', () => {
    const hidden = { ...demoProfile, username: 'hidden', publicEnabled: false };
    const insufficient = { ...demoProfile, username: 'new', scoreEligible: false };
    const eligible = { ...demoProfile, username: 'ready', score: 64 };

    expect(rankLeaderboardProfiles([hidden, insufficient, eligible, null])).toEqual([
      expect.objectContaining({ username: 'ready', score: 64, rank: 1 }),
    ]);
  });

  it('uses delivery and active days as deterministic score tie breakers', () => {
    const lowerDelivery = { ...demoProfile, username: 'beta', score: 70, deliveryPoints: 20, activeDays: 60 };
    const higherDelivery = { ...demoProfile, username: 'alpha', score: 70, deliveryPoints: 30, activeDays: 30 };

    expect(rankLeaderboardProfiles([lowerDelivery, higherDelivery]).map((profile) => profile.username)).toEqual(['alpha', 'beta']);
  });
});
