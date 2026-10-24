import { describe, expect, it } from 'vitest';
import { buildProfileArchetype } from './profile-archetype';

const baseline = { tokens: 0, currentStreak: 0, providerCount: 1, deliveryPoints: 0, toolCalls: 0, activeDays: 0 };

describe('workflow personalities', () => {
  it('does not turn token spending or cache volume into identity tiers', () => {
    for (const traits of [{}, { currentStreak: 21 }, { providerCount: 3 }, { toolCalls: 800 }, { activeDays: 40 }]) {
      const modest = buildProfileArchetype({ ...baseline, ...traits, tokens: 100 });
      expect(buildProfileArchetype({ ...baseline, ...traits, tokens: 9e9 })).toEqual(modest);
      expect(modest.summary).toContain('not token volume');
      expect(modest.summary).toContain('not a skill rating');
    }
  });
  it('makes a welcoming identity for newcomers without inventing achievements', () => {
    const result = buildProfileArchetype(baseline);
    expect(result.title).toBe('Pocket Spark');
    expect(result.summary).not.toContain('0 days straight');
  });
  it('explains the actual signal and uses broad, deterministic milestones', () => {
    expect(buildProfileArchetype({ ...baseline, currentStreak: 21 }).title).toBe('Streak Sprout');
    expect(buildProfileArchetype({ ...baseline, currentStreak: 73 }).title).toBe('Streak Dragon');
    expect(buildProfileArchetype({ ...baseline, currentStreak: 31 }).summary).toContain('31 days straight');
    expect(buildProfileArchetype({ ...baseline, providerCount: 3 }).summary).toContain('3 tools');
    expect(buildProfileArchetype({ ...baseline, toolCalls: 500 }).summary).toContain('500 recorded tool calls');
    expect(buildProfileArchetype({ ...baseline, activeDays: 7 }).title).toBe('Flow Rider');
  });
  it('offers 20 short identities across different habits', () => {
    const inputs = [
      ...[0, 1, 7, 30, 90].map((activeDays) => ({ activeDays })),
      ...[7, 14, 30, 60, 90].map((currentStreak) => ({ currentStreak })),
      ...[2, 3, 4, 5, 6].map((providerCount) => ({ providerCount })),
      ...[100, 500, 2000, 10000, 50000].map((toolCalls) => ({ toolCalls })),
    ];
    const titles = inputs.map((input) => buildProfileArchetype({ ...baseline, ...input }).title);
    expect(new Set(titles).size).toBe(20);
    expect(titles.every((title) => title.length <= 18)).toBe(true);
  });
  it('does not turn malformed metrics into achievements', () => {
    const result = buildProfileArchetype({ ...baseline, tokens: Infinity, currentStreak: NaN, providerCount: -2, toolCalls: -1, activeDays: Infinity });
    expect(result.title).toBe('Pocket Spark');
    expect(result.summary).not.toMatch(/NaN|Infinity/);
  });
});
