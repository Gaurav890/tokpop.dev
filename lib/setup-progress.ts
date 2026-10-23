import type { ActivityBatch } from '@ai-native-profile/schema';

export type SetupReceipt = { sources: string[]; activeDays: number };
export type SetupProgress = {
  deviceId: string;
  stage: 'waiting' | 'paired' | 'imported' | 'limited' | 'empty' | 'unknown' | 'expired' | 'revoked';
  receipt: SetupReceipt | null;
};

export function setupReceipt(batch: Pick<ActivityBatch, 'daily'>): SetupReceipt {
  const usable = batch.daily.filter((day) => day.category === 'coding' && day.metrics.some((metric) => metric.value > 0));
  return { sources: [...new Set(usable.map((day) => day.source))], activeDays: new Set(usable.map((day) => day.date)).size };
}

export function setupProgress(device: { id: string; status: string; token_delivered: number; expires_at: string; last_seen_at: string | null; setup_receipt_json: string | null }, now = Date.now()): SetupProgress {
  let receipt: SetupReceipt | null = null;
  try {
    const value = JSON.parse(device.setup_receipt_json ?? 'null');
    if (Array.isArray(value?.sources) && value.sources.every((source: unknown) => typeof source === 'string') && Number.isFinite(value.activeDays)) receipt = value;
  } catch { /* Older uploads may not have a setup receipt. */ }
  const stage = device.status === 'revoked' ? 'revoked'
    : receipt ? receipt.sources.length ? 'imported' : 'empty'
    : device.last_seen_at ? 'unknown'
    : device.token_delivered ? 'paired'
    : Date.parse(device.expires_at) <= now ? 'expired' : 'waiting';
  return { deviceId: device.id, stage, receipt };
}

export const setupStorageKey = (login: string) => `tokpop:setup:v1:${login.toLowerCase()}`;
export const revealStorageKey = (login: string) => `tokpop:reveal:v1:${login.toLowerCase()}`;

export function hasCardActivity(profile: { activeDays: number; lifetimeTokens: number; sessions: number } | null): boolean {
  return Boolean(profile && (profile.activeDays > 0 || profile.lifetimeTokens > 0 || profile.sessions > 0));
}

export function readSetupAttempt(value: string | null): string | null {
  return value && /^[a-f0-9-]{36}$/i.test(value) ? value : null;
}
