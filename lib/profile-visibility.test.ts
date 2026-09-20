import { describe, expect, it } from 'vitest';
import { publicConversationRows } from './profile-visibility';

const rows = [
  { source: 'codex', value: 10 },
  { source: 'chatgpt_web', value: 2 },
  { source: 'claude_web', value: 3 },
];

describe('public conversation visibility', () => {
  it('returns no conversation activity until the owner explicitly enables it', () => {
    expect(publicConversationRows(rows, false)).toEqual([]);
  });

  it('returns only conversation sources after explicit opt-in', () => {
    expect(publicConversationRows(rows, true)).toEqual([
      { source: 'chatgpt_web', value: 2 },
      { source: 'claude_web', value: 3 },
    ]);
  });
});
