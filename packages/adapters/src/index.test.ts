import { describe, expect, it } from 'vitest';
import { parseClaudeStatsCache, parseCodexUsage, parseCopilotCliEvents } from './index';

describe('provider adapters', () => {
  it('parses official Codex daily usage', () => {
    const result = parseCodexUsage({ summary: { lifetimeTokens: 200 }, dailyUsageBuckets: [{ startDate: '2026-09-10', tokens: 42 }] });
    expect(result.daily[0].metrics[0]).toMatchObject({ value: 42, provenance: 'official_account_api' });
  });
  it('combines Claude activity and model tokens', () => {
    const result = parseClaudeStatsCache({ dailyActivity: [{ date: '2026-09-10', messageCount: 8, sessionCount: 2, toolCallCount: 3 }], dailyModelTokens: [{ date: '2026-09-10', tokensByModel: { sonnet: 120 } }] });
    expect(result.daily[0].metrics.find((metric) => metric.name === 'tokens')?.value).toBe(120);
  });
  it('survives malformed JSONL records', () => {
    const result = parseCopilotCliEvents('{bad}\n{"timestamp":"2026-09-10T10:00:00Z","type":"session_start"}');
    expect(result.daily).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});
