import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { SourceImportResults } from '../app/share/source-import-results';
import { BuildRecap } from '../app/share/build-recap';
import { buildRecap } from './build-recap';
import { ActivationShare } from '../app/share/activation-share';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());

describe('one workspace, clear rewards', () => {
  it('does not label absent upload sources failed or not installed', () => {
    const html = renderToStaticMarkup(<SourceImportResults receipt={{ sources: ['codex'], activeDays: 3 }}/>);
    expect(html).toContain('✓ Activity received');
    expect(html.match(/No activity in this upload/g)).toHaveLength(4);
    expect(html).toContain('No need to pair again');
    expect(html).not.toContain('Not installed');
  });
  it('explains the uncertainty of blank recap days without shaming inactive users', () => {
    const html = renderToStaticMarkup(<BuildRecap recap={buildRecap([], [], Date.parse('2026-10-24'))}/>);
    expect(html).toContain('Your next chapter is unwritten');
    expect(html).toContain('Blank days can mean missing history');
    expect(html).not.toContain('0 / 7');
  });
  it('offers local image export before publishing while keeping README consent explicit', () => {
    const html = renderToStaticMarkup(<ActivationShare username="builder" initialSettings={{ publicEnabled: false, leaderboardEnabled: false, comparisonEnabled: false, conversationEnabled: false, storageMode: 'managed' }} profile={{ score: null, scoreEligible: false, activeDays: 7, streakDays: 3, deliveryPoints: 0, providers: ['one'], lifetimeTokens: 100, tokenBreakdown: [], sessions: 3, updatedAt: '2026-10-24', archetype: { emoji: '✨', title: 'Pocket Spark', summary: 'Based on available activity, not token volume.' } }}/>);
    expect(html).toContain('YOUR BUILDER PERSONALITY');
    expect(html).toContain('No profile publishing required');
    expect(html).toContain('This makes your profile and stats card public');
    expect(html).toContain('Posting the image shares the stats shown on it');
    expect(html).toContain('>Download card image ↓</button>');
    expect(html).toContain('>Copy caption</button>');
  });
});
