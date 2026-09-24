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
    expect(merged[0].metrics.find((item) => item.name === 'tokens')?.value).toBe(54);
    expect(merged[1].metrics.find((item) => item.name === 'tokens')?.value).toBe(100);
    expect(legacy.undatedCacheTokens).toBe(100);
    expect(legacy.daily[0].metrics.find((item) => item.name === 'tokens')?.provenance).toBe('estimated');
  });

  it('preserves the complete Claude covered-period total, including cache tokens', () => {
    const result = parseClaudeStatsCache({
      dailyActivity: [
        { date: '2025-12-20', messageCount: 10, sessionCount: 2 },
        { date: '2025-12-21', messageCount: 20, sessionCount: 3 },
      ],
      dailyModelTokens: [
        { date: '2025-12-20', tokensByModel: { 'claude-sonnet-5': 100_000 } },
        { date: '2025-12-21', tokensByModel: { 'claude-sonnet-5': 199_733 } },
      ],
      modelUsage: {
        'claude-sonnet-5': {
          inputTokens: 32_313,
          outputTokens: 267_420,
          cacheReadInputTokens: 126_793_489,
          cacheCreationInputTokens: 9_419_327,
        },
      },
    });

    const totals = result.daily.flatMap((day) => day.metrics).reduce((sum, item) => item.name === 'tokens' ? sum + item.value : sum, 0);
    const cacheRead = result.daily.flatMap((day) => day.metrics).reduce((sum, item) => item.name === 'cache_read_input_tokens' ? sum + item.value : sum, 0);
    const cacheCreation = result.daily.flatMap((day) => day.metrics).reduce((sum, item) => item.name === 'cache_creation_input_tokens' ? sum + item.value : sum, 0);
    expect(totals).toBe(136_512_549);
    expect(cacheRead).toBe(126_793_489);
    expect(cacheCreation).toBe(9_419_327);
    expect(result.estimatedCacheTokens).toBe(136_212_816);
    expect(result.estimatedDates).toBe(2);
    expect(result.daily.flatMap((day) => day.metrics).filter((item) => item.name.endsWith('tokens'))
      .every((item) => item.provenance === 'estimated' && item.competitiveEligible === false)).toBe(true);
  });

  it('uses a file-derived session id and camel-case usage fields when needed', () => {
    const accumulator = createClaudeSessionAccumulator();
    addClaudeSessionEvent(accumulator, {
      timestamp: '2026-09-20T10:00:00.000Z',
      uuid: 'record-one',
      message: {
        model: 'sonnet',
        usage: { inputTokens: 2, outputTokens: 3, cacheCreationInputTokens: 5, cacheReadInputTokens: 7 },
      },
    }, { sessionId: 'filename-session' });
    const result = finalizeClaudeSessionUsage(accumulator);
    expect(result.daily[0].metrics.find((item) => item.name === 'tokens')?.value).toBe(17);
    expect(result.daily[0].metrics.find((item) => item.name === 'sessions')?.value).toBe(1);
  });
});
