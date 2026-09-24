import { describe, expect, it } from 'vitest';
import { CARD_RESPONSE_HEADERS, cardFunnelPath, previewCardPath, stableCardPath } from './card-cache';

describe('card cache policy', () => {
  it('forces browser revalidation and limits shared CDN staleness', () => {
    expect(CARD_RESPONSE_HEADERS['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(CARD_RESPONSE_HEADERS['vercel-cdn-cache-control']).toContain('s-maxage=60');
  });

  it('keeps copied URLs stable while versioning the on-page preview', () => {
    expect(stableCardPath('octocat', 'dark')).toBe('/api/v1/cards/octocat?theme=dark');
    expect(previewCardPath('octocat', 'dark', '2026-09-20T19:45:00.000Z')).toBe('/api/v1/cards/octocat?theme=dark&v=2026-09-20T19%3A45%3A00.000Z');
  });

  it('gives each shared card a creator-attributed make-yours destination', () => {
    expect(cardFunnelPath('octocat')).toBe('/make/octocat');
    expect(cardFunnelPath('name with spaces')).toBe('/make/name%20with%20spaces');
  });
});
