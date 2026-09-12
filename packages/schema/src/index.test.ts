import { describe, expect, it } from 'vitest';
import { competitiveEligible, validateActivityBatch } from './index';

const batch = { schemaVersion: 'anp.activity.v1', batchId: 'one', deviceId: 'device', generatedAt: '2026-09-12T00:00:00Z', collectorVersion: '0.1.0', signature: 'signed', daily: [], coverage: [] } as const;
describe('activity schema boundary', () => {
  it('permanently excludes conversation and estimated evidence', () => {
    expect(competitiveEligible('chatgpt_web', 'mcp_observed')).toBe(false);
    expect(competitiveEligible('codex', 'estimated')).toBe(false);
    expect(competitiveEligible('codex', 'official_account_api')).toBe(true);
  });
  it('accepts an empty signed aggregate batch', () => expect(validateActivityBatch(batch).ok).toBe(true));
  it('rejects web conversation activity marked competitive', () => {
    const invalid = { ...batch, daily: [{ date: '2026-09-12', source: 'chatgpt_web', category: 'conversation', metrics: [{ name: 'sessions', value: 1, unit: 'count', provenance: 'mcp_observed', source: 'chatgpt_web', coverageStart: '2026-09-12', coverageEnd: '2026-09-12', competitiveEligible: true }] }] };
    expect(validateActivityBatch(invalid).ok).toBe(false);
  });
});
