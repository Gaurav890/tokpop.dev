import { describe, expect, it } from 'vitest';
import { buildProfileArchetype } from './profile-archetype';

const baseline = { tokens: 0, currentStreak: 0, providerCount: 1, deliveryPoints: 0, toolCalls: 0 };

describe('profile archetypes', () => {
  it('does not praise a zero-day streak as relentless', () => {
    const result = buildProfileArchetype({ ...baseline, tokens: 2_000_000_000 });
    expect(result.summary).not.toContain('0 days straight');
    expect(result.summary).not.toContain('relentless');
    expect(result.summary).toContain('cache usage');
  });
  it('recognizes billion-token workflows', () => {
    expect(buildProfileArchetype({ ...baseline, tokens: 3_448_261_371, currentStreak: 48 })).toMatchObject({ emoji: '🥷', title: 'Token Ninja' });
  });

  it('uses aggregate signals instead of user content', () => {
    expect(buildProfileArchetype({ ...baseline, currentStreak: 31 })).toEqual({
      emoji: '🔥',
      title: 'Streak Machine',
      summary: '31 days straight. The system is still warm.',
    });
  });
});
