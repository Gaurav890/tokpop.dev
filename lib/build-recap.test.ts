import { describe, expect, it } from 'vitest';
import { buildRecap } from './build-recap';

const now = Date.parse('2026-10-24T01:00:00Z');
describe('seven-day observed recap', () => {
  it('uses a rolling UTC window including today, not the last uploaded date', () => {
    const recap = buildRecap([{ date: '2026-09-12', value: 4 }], [], now);
    expect(recap.start).toBe('2026-10-18');
    expect(recap.end).toBe('2026-10-24');
    expect(recap.activeDays).toBe(0);
    expect(recap.longestRun).toBe(0);
  });
  it('deduplicates activity and excludes invalid, old and future records', () => {
    const recap = buildRecap([
      { date: '2026-10-18', value: 1 }, { date: '2026-10-18', value: 4 },
      { date: '2026-10-19', value: 1 }, { date: '2026-10-20', value: 0 },
      { date: '2026-10-21', value: NaN }, { date: '2026-10-24', value: 4 },
      { date: '2026-10-25', value: 4 },
    ], [
      { date: '2026-10-18', total: 20, bySource: { codex: 20, claude_code: 0 } },
      { date: '2026-10-19', total: 30, bySource: { codex: 30 } },
      { date: '2026-10-25', total: 10, bySource: { claude_code: 10 } },
    ], now);
    expect(recap.activeDays).toBe(3);
    expect(recap.longestRun).toBe(2);
    expect(recap.tokenSources).toBe(1);
    expect(recap.days).toHaveLength(7);
  });
});
