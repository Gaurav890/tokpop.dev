import { describe, expect, it } from 'vitest';
import { parseClaudeSessionLogs, parseClaudeStatsCache, parseCodexUsage, parseCopilotCliEvents } from './index';

describe('provider adapters', () => {
  it('parses official Codex daily usage', () => {
    const result = parseCodexUsage({ summary: { lifetimeTokens: 200 }, dailyUsageBuckets: [{ startDate: '2026-09-10', tokens: 42 }] });
    expect(result.daily[0].metrics[0]).toMatchObject({ value: 42, provenance: 'official_account_api' });
  });
  it('combines Claude activity and model tokens', () => {
    const result = parseClaudeStatsCache({ dailyActivity: [{ date: '2026-09-10', messageCount: 8, sessionCount: 2, toolCallCount: 3 }], dailyModelTokens: [{ date: '2026-09-10', tokensByModel: { sonnet: 120 } }] });
    expect(result.daily[0].metrics.find((metric) => metric.name === 'tokens')?.value).toBe(120);
    expect(result.coverage.completeness).toBe('partial');
  });
  it('deduplicates Claude session records and counts cache tokens', () => {
    const first = { timestamp: '2026-09-10T10:00:00Z', sessionId: 's1', message: { id: 'm1', model: 'sonnet', content: [{ type: 'tool_use' }], usage: { input_tokens: 2, output_tokens: 3, cache_creation_input_tokens: 5, cache_read_input_tokens: 7 } } };
    const latest = { ...first, timestamp: '2026-09-10T10:00:01Z', message: { ...first.message, usage: { ...first.message.usage, output_tokens: 4 } } };
    const result = parseClaudeSessionLogs(`${JSON.stringify(first)}\n${JSON.stringify(latest)}`);
    const metrics = Object.fromEntries(result.daily[0].metrics.map((item) => [item.name, item.value]));
    expect(metrics).toMatchObject({ tokens: 18, input_tokens: 2, output_tokens: 4, cache_creation_input_tokens: 5, cache_read_input_tokens: 7, sessions: 1, turns: 1, tool_calls: 1 });
    expect(result.coverage.completeness).toBe('partial');
  });
  it('survives malformed JSONL records', () => {
    const result = parseCopilotCliEvents('{bad}\n{"timestamp":"2026-09-10T10:00:00Z","type":"session_start"}');
    expect(result.daily).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});
