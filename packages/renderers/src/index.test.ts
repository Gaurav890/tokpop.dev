import { describe, expect, it } from 'vitest';
import { renderBadge, renderProfileCard, renderSocialCard } from './index';

describe('SVG renderers', () => {
  it('escapes user-controlled XML', () => {
    const svg = renderProfileCard({ username: '<script>', score: 72, activeDays: 30, streakDays: 5, providers: ['Codex'], updatedAt: 'today' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
  it('renders an unranked badge safely', () => expect(renderBadge(null)).toContain('unranked'));
  it('renders story cards at the requested dimensions', () => {
    const svg = renderSocialCard({ username: 'demo', score: 72, activeDays: 30, streakDays: 5, providers: ['Codex'], updatedAt: 'today' }, 'story');
    expect(svg).toContain('width="1080" height="1920"');
  });
});
