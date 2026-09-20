import { describe, expect, it } from 'vitest';
import { buildDailyTokenLedger } from './token-ledger';

describe('daily token ledger', () => {
  it('groups providers by date and returns newest days first', () => {
    expect(buildDailyTokenLedger([
      { date: '2026-09-19', source: 'codex', value: 10 },
      { date: '2026-09-20', source: 'claude_code', value: 7 },
      { date: '2026-09-20', source: 'codex', value: 12 },
      { date: '2026-09-20', source: 'codex', value: 3 },
      { date: '2026-09-18', source: 'codex', value: 0 },
    ])).toEqual([
      { date: '2026-09-20', total: 22, bySource: { claude_code: 7, codex: 15 } },
      { date: '2026-09-19', total: 10, bySource: { codex: 10 } },
    ]);
  });
});
