import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { captionWithProfile, linkedInCaption } from './linkedin-share';
import { LinkedInShare } from '../app/share/linkedin-share';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());
const card = { username: 'builder', score: 42, tokens: 123000, activeDays: 12, streakDays: 3, providers: ['Tool A', 'Tool B'], tokenBreakdown: [], updatedAt: '2026-11-14', archetype: { emoji: '✨', title: 'Pocket Spark' } };

describe('LinkedIn sharing', () => {
  it('describes recorded activity without inventing a skill rating', () => {
    const caption = linkedInCaption(card);
    expect(caption).toContain('12 recorded active days, with a 3-day streak');
    expect(caption).toContain('Tool A, Tool B');
    expect(caption).toContain('not a skill rating');
    expect(caption).not.toContain('/u/');
  });
  it('handles new profiles and singular days', () => {
    expect(linkedInCaption({ ...card, activeDays: 0, streakDays: 0, providers: [] })).toContain('just getting started');
    expect(linkedInCaption({ ...card, activeDays: 1, streakDays: 0 })).toContain('1 recorded active day.');
  });
  it('keeps edited captions intact and only appends an explicitly supplied public link', () => {
    expect(captionWithProfile(' My own words ')).toBe('My own words');
    expect(captionWithProfile('My own words', 'https://tokpop.dev/u/builder')).toBe('My own words\n\nMy activity and receipts: https://tokpop.dev/u/builder');
  });
  it('offers private export without silent publishing or auto-posting', () => {
    const html = renderToStaticMarkup(<LinkedInShare card={card} theme="dark" publishing={false} onPublish={async () => {}}/>);
    expect(html).toContain('Your profile is private, so no profile link is included');
    expect(html).toContain('Nothing is posted automatically');
    expect(html).toContain('Publish profile for LinkedIn');
    expect(html).toContain('It does not join the leaderboard');
    expect(html).not.toContain('https://tokpop.dev/u/builder');
  });
  it('offers the public profile for Featured separately from the snapshot image', () => {
    const html = renderToStaticMarkup(<LinkedInShare card={card} theme="light" publicProfileUrl="https://tokpop.dev/u/builder" publishing={false} onPublish={async () => {}}/>);
    expect(html).toContain('Copy Featured link');
    expect(html).toContain('LinkedIn may cache its preview image');
    expect(html).not.toContain('Publish profile for LinkedIn');
  });
});
