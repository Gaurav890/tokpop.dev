import { describe, expect, it } from 'vitest';
import { activityWindow, buildActivityHistory } from './activity-window';

describe('activity windows', () => {
  const now = Date.parse('2026-10-22T22:30:00Z');
  const history = buildActivityHistory(new Map([['2026-10-22', 2], ['2026-06-01', 3], ['2025-12-01', 9]]), now);
  it('returns a full year of date-aligned history from the profile builder', () => {
    expect(history).toHaveLength(365);
    expect(history[0].date).toBe('2025-10-23');
    expect(history.at(-1)?.date).toBe('2026-10-22');
    expect(history.find((day) => day.date === '2025-12-01')?.value).toBe(4);
  });
  it('changes both dates and active-day counts with each range', () => {
    const short = activityWindow(history, '12w')!;
    const half = activityWindow(history, '6m')!;
    const year = activityWindow(history, 'year')!;
    expect(short.days).toHaveLength(84);
    expect(short.start).toBe('2026-07-31');
    expect(half.start).toBe('2026-04-23');
    expect(year.days).toHaveLength(365);
    expect([short.activeDays, half.activeDays, year.activeDays]).toEqual([1, 2, 3]);
  });
  it('aligns Monday first and leaves the last partial week blank', () => {
    const result = activityWindow(history, '12w')!;
    expect(result.leading).toBe(4);
    expect(result.trailing).toBe(3);
    expect((result.leading + result.days.length + result.trailing) % 7).toBe(0);
  });
  it('does not turn missing older API history into measured zeros', () => {
    const result = activityWindow(history.slice(-84), 'year')!;
    expect(result.missingDays).toBe(281);
    expect(result.days[0].value).toBeNull();
    expect(result.days.at(-2)?.value).toBe(0);
  });
  it('handles leap days and month-end clamping', () => {
    const result = activityWindow(buildActivityHistory(new Map(), Date.parse('2024-08-31')), '6m')!;
    expect(result.start).toBe('2024-03-01');
    const leap = activityWindow(buildActivityHistory(new Map(), Date.parse('2024-03-01')), '12w')!;
    expect(leap.days.some((day) => day.date === '2024-02-29')).toBe(true);
  });
  it('handles empty and unordered history without mutating input', () => {
    expect(activityWindow([], 'year')).toBeNull();
    const rows = [history.at(-1)!, history[0]];
    expect(activityWindow(rows, 'year')?.end).toBe('2026-10-22');
    expect(rows[0].date).toBe('2026-10-22');
  });
});
