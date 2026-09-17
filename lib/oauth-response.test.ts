import { describe, expect, it } from 'vitest';
import { oauthClientTarget, redirectToOAuthClient } from './oauth-response';

describe('OAuth authorization response', () => {
  it('turns the consent form POST into a GET callback', () => {
    const target = new URL('https://client.example/callback?code=temporary-code&state=opaque-state');
    const response = redirectToOAuthClient(target);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(target.toString());
  });

  it('returns a verified target for an explicit browser GET navigation', async () => {
    const target = new URL('https://client.example/callback?code=temporary-code&state=opaque-state');
    const response = oauthClientTarget(target);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({ redirectTo: target.toString() });
  });
});
