import { describe, expect, it } from 'vitest';
import type { ActivityBatch } from '@ai-native-profile/schema';
import { privacyCheck } from './privacy';

const batch: ActivityBatch = {
  schemaVersion: 'anp.activity.v1', batchId: 'b1', deviceId: 'd1', generatedAt: '2026-09-10T10:00:00Z', collectorVersion: '0.1.0', signature: 'signed',
  daily: [{ date: '2026-09-10', source: 'codex', category: 'coding', metrics: [{ name: 'tokens', value: 10, unit: 'count', provenance: 'official_account_api', source: 'codex', coverageStart: '2026-09-10', coverageEnd: '2026-09-10', competitiveEligible: true }] }],
  coverage: [{ source: 'codex', coverageStart: '2026-09-10', coverageEnd: '2026-09-10', lastSyncedAt: '2026-09-10T10:00:00Z', completeness: 'full', competitiveEligible: true }],
};

describe('privacy firewall', () => {
  it('accepts the strict aggregate contract', () => expect(privacyCheck(batch).ok).toBe(true));
  it('rejects prompt-shaped fields', () => expect(privacyCheck({ ...batch, prompt: 'secret' }).ok).toBe(false));
  it('rejects credential-shaped values', () => expect(privacyCheck({ ...batch, signature: 'sk-abcdefghijklmnopqrstuvwxyz123456' }).ok).toBe(false));
});
