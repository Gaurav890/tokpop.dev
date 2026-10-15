import { describe, expect, it } from 'vitest';
import { githubReceiptWindow, syncFreshness, utcTimestamp } from './data-freshness';

const now = Date.parse('2026-10-14T12:00:00Z');
const coverage = { note: 'anp.github-contributions.v2: snapshot', coverage_start: '2026-07-17', coverage_end: '2026-10-14', last_synced_at: '2026-10-14T11:00:00Z' };
describe('data freshness', () => {
  it('requires real timestamps, not just a verification marker', () => {
    expect(githubReceiptWindow({ note: coverage.note }, now)).toEqual({ verified: false, fresh: false });
    expect(githubReceiptWindow(coverage, now)).toEqual({ verified: true, fresh: true });
  });
  it('retains historical receipts without calling them current', () => {
    expect(githubReceiptWindow(coverage, now + 25 * 60 * 60_000)).toEqual({ verified: true, fresh: false });
  });
  it('rejects legacy, malformed, and future windows', () => {
    for (const change of [{ note: 'Public Events API' }, { coverage_start: '2026-07-16' }, { last_synced_at: '2027-01-01T00:00:00Z' }, { coverage_end: 'not-a-date' }]) expect(githubReceiptWindow({ ...coverage, ...change }, now).verified).toBe(false);
  });
  it('distinguishes delayed and unknown syncs', () => {
    expect(syncFreshness('2026-10-14T11:30:00Z', now)).toBe('recent');
    expect(syncFreshness('2026-10-09T11:30:00Z', now)).toBe('delayed');
    expect(syncFreshness(undefined, now)).toBe('unknown');
    expect(syncFreshness('2026-10-15T12:00:00Z', now)).toBe('unknown');
  });
  it('labels timestamps explicitly in UTC and handles missing dates', () => {
    expect(utcTimestamp('2026-10-15T01:00:00Z')).toBe('2026-10-15 01:00 UTC');
    expect(utcTimestamp('')).toBe('Not recorded');
  });
});
