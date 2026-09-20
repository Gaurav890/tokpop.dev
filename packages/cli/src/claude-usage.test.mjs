import { describe, expect, it } from 'vitest';
import { addClaudeSessionEvent, createClaudeSessionAccumulator, finalizeClaudeSessionUsage, mergeClaudeUsage, parseClaudeStatsCache } from './claude-usage.mjs';

function event(overrides = {}) {
  return {
    timestamp: '2026-09-20T10:00:00.000Z',
    sessionId: 'session-one',
    requestId: 'request-one',
    message: {
      id: 'message-one',
      model: 'claude-sonnet-test',
      content: [{ type: 'text' }, { type: 'tool_use' }],
      usage: { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 },
    },
    ...overrides,
  };
}

describe('Claude session usage', () => {
  it('counts all four token classes and never serializes message content', () => {
    const accumulator = createClaudeSessionAccumulator();
    addClaudeSessionEvent(accumulator, event());
    const result = finalizeClaudeSessionUsage(accumulator);
    const metrics = Object.fromEntries(result.daily[0].metrics.map((item) => [item.name, item.value]));
    expect(metrics).toMatchObject({ tokens: 100, input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 30, cache_read_input_tokens: 40, sessions: 1, turns: 1, tool_calls: 1 });
    expect(JSON.stringify(result)).not.toContain('message-one');
    expect(JSON.stringify(result)).not.toContain('tool_use');
  });

  it('deduplicates repeated message records and keeps the latest complete usage', () => {
    const accumulator = createClaudeSessionAccumulator();
    addClaudeSessionEvent(accumulator, event());
    addClaudeSessionEvent(accumulator, event({ timestamp: '2026-09-20T10:00:01.000Z', message: { ...event().message, usage: { input_tokens: 10, output_tokens: 25, cache_creation_input_tokens: 30, cache_read_input_tokens: 40 } } }));
    const metrics = Object.fromEntries(finalizeClaudeSessionUsage(accumulator).daily[0].metrics.map((item) => [item.name, item.value]));
    expect(metrics.tokens).toBe(105);
    expect(metrics.turns).toBe(1);
    expect(metrics.tool_calls).toBe(1);
  });

  it('uses legacy cache rows only for dates not covered by session logs', () => {
    const accumulator = createClaudeSessionAccumulator();
    addClaudeSessionEvent(accumulator, event());
    const sessionDaily = finalizeClaudeSessionUsage(accumulator).daily;
    const legacy = parseClaudeStatsCache({
      dailyActivity: [{ date: '2026-09-19', messageCount: 3 }, { date: '2026-09-20', messageCount: 9 }],
      dailyModelTokens: [{ date: '2026-09-19', tokensByModel: { sonnet: 50 } }, { date: '2026-09-20', tokensByModel: { sonnet: 999 } }],
      modelUsage: { sonnet: { cacheReadInputTokens: 70, cacheCreationInputTokens: 30 } },
    });
    const merged = mergeClaudeUsage(sessionDaily, legacy.daily);
    expect(merged).toHaveLength(2);
    expect(merged[0].metrics.find((item) => item.name === 'tokens')?.value).toBe(50);
    expect(merged[1].metrics.find((item) => item.name === 'tokens')?.value).toBe(100);
    expect(legacy.undatedCacheTokens).toBe(100);
  });
});
