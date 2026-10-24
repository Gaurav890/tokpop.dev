import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { COLLECTOR_PREVIEW_COMMAND, CONNECTOR_VERSION } from './collector-command';
import { SiteHeader } from '../app/ui/site-header';
import { SiteFooter } from '../app/ui/site-footer';
import type { GitHubSession } from './auth';
import collectorPackage from '../packages/cli/package.json';

const mocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock('./auth', () => ({ currentGitHubUser: mocks.currentUser }));

import Home from '../app/page';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => mocks.currentUser.mockResolvedValue(null));

describe('low-friction, inspectable onboarding', () => {
  it('shows the collector preview without making it a required sign-in step', async () => {
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain(COLLECTOR_PREVIEW_COMMAND);
    expect(CONNECTOR_VERSION).toBe(collectorPackage.version);
    expect(COLLECTOR_PREVIEW_COMMAND).toContain('-- ai-native-profile preview');
    expect(html).toContain('This optional command uploads nothing to tokpop');
    expect(html).toContain('retained local token records as a fallback');
    expect(html).toContain('~/.claude/projects');
    expect(html).toContain('awake and online');
    expect(html).toContain('Node.js 22.13');
    expect(html).toContain('href="/api/auth/github/start?return_to=%2Fshare%3Fonboarding%3D1"');
    expect(html.indexOf('Reveal my builder card')).toBeLessThan(html.indexOf(COLLECTOR_PREVIEW_COMMAND));
    expect(html.indexOf('Reveal my builder card')).toBeLessThan(html.indexOf('home-card-drop'));
    expect(html).toContain('Example builder personalities');
    expect(html).not.toContain('class="home-alter-ego"');
    expect(html).not.toContain('in 30 seconds');
    expect(html).toContain('eligible history from your tools counts');
  });

  it('sends a returning user straight to their card', async () => {
    mocks.currentUser.mockResolvedValue({ login: 'builder' });
    const html = renderToStaticMarkup(await Home());
    expect(html).toContain('href="/share?onboarding=1"');
    expect(html).toContain('Open my card');
    expect(html).not.toContain('/api/auth/github/start');
  });

  it('keeps rankings discoverable without competing with the primary action', () => {
    const guest = renderToStaticMarkup(React.createElement(SiteHeader));
    const member = renderToStaticMarkup(React.createElement(SiteHeader, { user: { login: 'builder' } as GitHubSession }));
    const footer = renderToStaticMarkup(React.createElement(SiteFooter));
    expect(guest).not.toContain('/leaderboard');
    expect(member).not.toContain('/leaderboard');
    expect(member).toContain('href="/share"');
    expect(footer).toContain('href="/leaderboard"');
    expect(footer).toContain('https://github.com/Gaurav890/tokpop.dev');
  });
});
