import { describe, expect, it } from 'vitest';
import { resolveTokenMetrics, type ProfileMetricRow } from './profile-metrics';

const row = (overrides: Partial<ProfileMetricRow> = {}): ProfileMetricRow => ({
  date: '2026-09-20',
  source: 'claude_code',
  metric_name: 'tokens',
  value: 100,
  provenance: 'local_exact',
  competitive_eligible: 1,
  ...overrides,
});

describe('profile token metrics', () => {
  it('shows fuller upgraded history once without making estimates competitive', () => {
    const resolved = resolveTokenMetrics([
      row({ value: 299_733, provenance: 'local_exact' }),
      row({ value: 136_512_549, provenance: 'estimated', competitive_eligible: 0 }),
    ]);
    expect(resolved).toEqual([expect.objectContaining({ value: 136_512_549, provenance: 'estimated', competitive_eligible: 0 })]);
  });

  it('prefers an official account total even when a local value is larger', () => {
    const resolved = resolveTokenMetrics([
      row({ source: 'codex', value: 200, provenance: 'local_exact' }),
      row({ source: 'codex', value: 100, provenance: 'official_account_api' }),
    ]);
    expect(resolved[0]).toMatchObject({ value: 100, provenance: 'official_account_api' });
  });

  it('keeps component metrics separate while discarding non-token metrics', () => {
    const resolved = resolveTokenMetrics([
      row({ metric_name: 'input_tokens', value: 20 }),
      row({ metric_name: 'cache_read_input_tokens', value: 80 }),
      row({ metric_name: 'sessions', value: 4 }),
    ]);
    expect(resolved.map((item) => item.metric_name).sort()).toEqual(['cache_read_input_tokens', 'input_tokens']);
  });
});
