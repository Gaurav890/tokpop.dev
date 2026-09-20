import { describe, expect, it } from 'vitest';
import { renderBadge, renderProfileCard, renderSocialCard } from './index';

describe('SVG renderers', () => {
  const profile = { username: 'demo', score: 72, activeDays: 30, streakDays: 5, tokens: 1_200_000_000, tokenBreakdown: [{ label: 'Codex', tokens: 1_000_000_000 }, { label: 'Claude Code', tokens: 200_000_000 }], providers: ['Codex'], archetype: { emoji: '🥷', title: 'Token Ninja' }, updatedAt: '2026-09-20T00:00:00.000Z' };

  it('escapes user-controlled XML', () => {
    const svg = renderProfileCard({ ...profile, username: '<script>' });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });
  it('renders an unranked badge safely', () => expect(renderBadge(null)).toContain('unranked'));
  it('does not overstate locally collected evidence', () => {
    const svg = renderProfileCard(profile);
    expect(svg).toContain('SOURCE-LABELLED');
    expect(svg).not.toContain('Verified collection');
  });
  it('shows every provider without a hidden remainder', () => {
    const svg = renderProfileCard({ ...profile, providers: ['Codex', 'Claude Code', 'Cursor', 'Gemini CLI'] });
    expect(svg).toContain('Codex · Claude Code · Cursor');
    expect(svg).toContain('Gemini CLI');
    expect(svg).not.toContain('+1 more');
  });
  it('puts tokens and the workflow archetype on the card', () => {
    const svg = renderProfileCard(profile);
    expect(svg).toContain('1.2B');
    expect(svg).toContain('TOKEN NINJA');
    expect(svg).toContain('Codex');
    expect(svg).toContain('1B');
    expect(svg).toContain('Claude Code');
    expect(svg).toContain('200M');
    expect(svg).toContain('TOOL LOADOUT');
    expect(svg).toContain('MAKE YOURS');
  });
  it('renders story cards at the requested dimensions', () => {
    const svg = renderSocialCard(profile, 'story');
    expect(svg).toContain('width="1080" height="1920"');
  });
});
