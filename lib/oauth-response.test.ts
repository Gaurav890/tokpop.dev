import { describe, expect, it } from 'vitest';
import { redirectToOAuthClient } from './oauth-response';

describe('OAuth authorization response', () => {
  it('turns the consent form POST into a GET callback', () => {
    const target = new URL('https://client.example/callback?code=temporary-code&state=opaque-state');
    const response = redirectToOAuthClient(target);

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(target.toString());
  });
});
