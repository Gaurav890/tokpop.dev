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
    expect(buildProfileArchetype({ ...baseline, tokens: 1_800_000_000, currentStreak: 21 }).title).toBe('Token Comet');
    expect(buildProfileArchetype({ ...baseline, tokens: 7_000_000_000, currentStreak: 73 }).title).toBe('Cosmic Phoenix');
  });

  it('uses aggregate signals instead of user content', () => {
    expect(buildProfileArchetype({ ...baseline, currentStreak: 31 })).toMatchObject({
      emoji: '🔥',
      title: 'Spark Keeper',
    });
    expect(buildProfileArchetype({ ...baseline, currentStreak: 31 }).summary).toContain('31 days straight');
  });

  it('offers 20 distinct, short identities across volume and workflow styles', () => {
    const titles = new Set<string>();
    for (const tokens of [0, 1e6, 100e6, 1e9, 5e9]) {
      for (const traits of [{}, { currentStreak: 30 }, { providerCount: 3 }, { toolCalls: 100 }]) {
        const result = buildProfileArchetype({ ...baseline, tokens, ...traits });
        titles.add(result.title);
        expect(result.title.length).toBeLessThanOrEqual(18);
        expect(result.summary).toContain('not a skill rating');
      }
    }
    expect(titles.size).toBe(20);
  });

  it.each([
    [999_999, 'Pocket Spark'], [1_000_000, 'Token Tadpole'],
    [99_999_999, 'Token Tadpole'], [100_000_000, 'Token Goblin'],
    [999_999_999, 'Token Goblin'], [1_000_000_000, 'Token Comet'],
    [4_999_999_999, 'Token Comet'], [5_000_000_000, 'Token Supernova'],
  ])('uses an explicit token boundary at %s', (tokens, title) => {
    expect(buildProfileArchetype({ ...baseline, tokens }).title).toBe(title);
  });

  it('does not let a billion tokens hide workflow personality', () => {
    expect(buildProfileArchetype({ ...baseline, tokens: 1.8e9, providerCount: 3 }).title).toBe('Stack Sorcerer');
    expect(buildProfileArchetype({ ...baseline, tokens: 1.8e9, toolCalls: 100 }).title).toBe('Workflow Wizard');
    expect(buildProfileArchetype({ ...baseline, tokens: 1.8e9, currentStreak: 30 }).title).toBe('Streak Dragon');
  });

  it('stays deterministic and does not turn malformed metrics into achievements', () => {
    const input = { ...baseline, tokens: 7e9, currentStreak: 73, providerCount: 4, toolCalls: 9000 };
    expect(buildProfileArchetype(input)).toEqual(buildProfileArchetype(input));
    const result = buildProfileArchetype({ ...baseline, tokens: Infinity, currentStreak: NaN, providerCount: -2, toolCalls: -1 });
    expect(result.title).toBe('Pocket Spark');
    expect(result.summary).not.toMatch(/NaN|Infinity/);
  });
});
