import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user:vi.fn(), first:vi.fn(), bind:vi.fn(), profile:vi.fn() }));
vi.mock('./auth', () => ({ currentGitHubUser:mocks.user }));
vi.mock('../db/ensure', () => ({ ensureDb:vi.fn() }));
vi.mock('@/lib/runtime-env', () => ({ runtimeEnv:{ DB:{ prepare:() => ({ bind:mocks.bind }) } } }));
vi.mock('./profile', () => ({ getPrivateProfile:mocks.profile }));
import { GET } from '../app/api/v1/device/setup/route';
const id = '12345678-1234-1234-1234-123456789abc';
const request = () => new NextRequest(`http://localhost/api/v1/device/setup?deviceId=${id}`);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ userId:'owner', login:'builder' });
  mocks.bind.mockReturnValue({ first:mocks.first });
  mocks.first.mockResolvedValue({ id,status:'approved',token_delivered:1,expires_at:'2020-01-01',last_seen_at:'2026-10-23',setup_receipt_json:JSON.stringify({ sources:['cursor'], activeDays:2 }) });
  mocks.profile.mockResolvedValue({ activeDays:0, lifetimeTokens:0, sessions:0 });
});
describe('setup status ownership and card readiness', () => {
  it('requires authentication before looking up devices', async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(401);
    expect(mocks.bind).not.toHaveBeenCalled();
  });
  it('looks up only the signed-in account’s device', async () => {
    mocks.first.mockResolvedValue(null);
    expect((await GET(request())).status).toBe(404);
    expect(mocks.bind).toHaveBeenCalledWith(id,'owner');
  });
  it('does not reveal a card for non-card-ready activity', async () => {
    const response = await GET(request());
    expect((await response.json()).stage).toBe('limited');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('uses the same stored profile readiness as the card page', async () => {
    mocks.profile.mockResolvedValue({ activeDays:0,lifetimeTokens:42,sessions:0 });
    expect((await (await GET(request())).json()).stage).toBe('imported');
  });
  it('does not retrieve a profile for an empty upload', async () => {
    mocks.first.mockResolvedValue({ id,status:'approved',token_delivered:1,setup_receipt_json:'{"sources":[],"activeDays":0}' });
    expect((await (await GET(request())).json()).stage).toBe('empty');
    expect(mocks.profile).not.toHaveBeenCalled();
  });
});
