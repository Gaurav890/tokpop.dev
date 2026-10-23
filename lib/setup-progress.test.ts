import { describe, expect, it } from 'vitest';
import type { DailyActivity } from '@ai-native-profile/schema';
import { readSetupAttempt, setupProgress, setupReceipt, setupStorageKey } from './setup-progress';

const device = { id:'12345678-1234-1234-1234-123456789abc', status:'approved', token_delivered:0, expires_at:'2026-10-23T10:00:00Z', last_seen_at:null, setup_receipt_json:null };
const now = Date.parse('2026-10-23T09:00:00Z');
const day = (source: string, value: number, category = 'coding') => ({ source, date:'2026-10-23', category, metrics:[{ value }] }) as DailyActivity;

describe('honest, resumable setup progress', () => {
  it('does not confuse an empty upload with imported history', () => {
    const receipt = setupReceipt({ daily:[day('codex',0), day('claude_web',12,'conversation')] });
    expect(receipt).toEqual({ sources:[], activeDays:0 });
    expect(setupProgress({ ...device, token_delivered:1, last_seen_at:'2026-10-23T09:00:00Z', setup_receipt_json:JSON.stringify(receipt) },now).stage).toBe('empty');
  });
  it('counts usable coding sources and distinct days without inventing missing tools', () => {
    const receipt = setupReceipt({ daily:[day('codex',20),day('codex',10),day('claude_code',0)] });
    expect(receipt).toEqual({ sources:['codex'], activeDays:1 });
    expect(setupProgress({ ...device, setup_receipt_json:JSON.stringify(receipt) },now).stage).toBe('imported');
  });
  it('expires only an unclaimed command, not a paired computer', () => {
    expect(setupProgress(device,now).stage).toBe('waiting');
    expect(setupProgress(device,now+7200000).stage).toBe('expired');
    expect(setupProgress({ ...device, token_delivered:1 },now+7200000).stage).toBe('paired');
  });
  it('keeps old receipts unknown and revoked devices revoked', () => {
    expect(setupProgress({ ...device, last_seen_at:'2026-10-23', setup_receipt_json:'invalid' },now).stage).toBe('unknown');
    expect(setupProgress({ ...device, status:'revoked', setup_receipt_json:'{"sources":["codex"],"activeDays":1}' },now).stage).toBe('revoked');
  });
  it('only restores a non-secret identifier scoped to the signed-in account', () => {
    expect(readSetupAttempt(device.id)).toBe(device.id);
    expect(readSetupAttempt('SHORT_PAIRING_CODE')).toBeNull();
    expect(readSetupAttempt('{"userCode":"SECRET"}')).toBeNull();
    expect(setupStorageKey('Builder')).toBe(setupStorageKey('builder'));
    expect(setupStorageKey('builder')).not.toBe(setupStorageKey('someone-else'));
  });
});
