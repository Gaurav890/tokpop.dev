import { describe, expect, it } from 'vitest';
import { summarizeTokens } from './token-summary';
import { tokenComponents, type ProfileMetricRow } from './profile-metrics';

const row = (metric_name: string, value: number, overrides: Partial<ProfileMetricRow> = {}): ProfileMetricRow => ({ date: '2026-10-14', source: 'claude_code', metric_name, value, provenance: 'local_exact', competitive_eligible: 1, ...overrides });
describe('token component accounting', () => {
  it('reconciles reported components and unknown history to the total', () => {
    const result = summarizeTokens([{ tokens: 100, components: { input: 5, output: 10, cacheCreation: 15, cacheRead: 50, combinedOnly: 20 } }, { tokens: 200 }]);
    expect(result).toEqual({ input: 5, output: 10, cacheCreation: 15, cacheRead: 50, unclassified: 220 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(300);
  });
  it('does not call combined-only tokens fresh', () => {
    expect(summarizeTokens([{ tokens: 100 }])).toEqual({ input: 0, output: 0, cacheCreation: 0, cacheRead: 0, unclassified: 100 });
  });
  it('rejects over-counted component sets', () => {
    expect(summarizeTokens([{ tokens: 10, components: { input: 20, output: 0, cacheCreation: 0, cacheRead: 0, combinedOnly: 0 } }]).unclassified).toBe(10);
  });
  it('does not mix provenance or dates to invent a breakdown', () => {
    expect(tokenComponents([row('tokens', 100), row('cache_read_input_tokens', 80, { provenance: 'estimated' }), row('output_tokens', 90, { date: '2026-10-13' })])).toMatchObject({ input: 0, output: 0, cacheRead: 0, combinedOnly: 100 });
  });
  it('reconciles per day, not by subtracting mismatched lifetime totals', () => {
    expect(tokenComponents([row('tokens', 100), row('cache_read_input_tokens', 120), row('tokens', 200, { date: '2026-10-13' })])).toMatchObject({ cacheRead: 0, combinedOnly: 300 });
  });
});
