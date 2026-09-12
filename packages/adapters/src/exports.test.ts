import { describe, expect, it } from 'vitest';
import { parseConversationExport } from './exports';

describe('conversation export aggregation', () => {
  it('keeps only counts and dates from a ChatGPT export', () => {
    const result = parseConversationExport('chatgpt_web', [{ title: 'PRIVATE CANARY', create_time: 1_725_523_200, mapping: { a: { message: { content: { parts: ['DO NOT LEAK'] } } }, b: { message: null } } }]);
    expect(result.days).toEqual([{ date: '2024-09-05', sessions: 1, turns: 1 }]);
    expect(JSON.stringify(result)).not.toContain('CANARY');
    expect(JSON.stringify(result)).not.toContain('LEAK');
  });

  it('aggregates Claude conversations by day', () => {
    const result = parseConversationExport('claude_web', [{ created_at: '2025-01-02T03:00:00Z', chat_messages: [{ text: 'secret' }, { text: 'secret' }] }]);
    expect(result.days[0]).toEqual({ date: '2025-01-02', sessions: 1, turns: 2 });
  });
});
