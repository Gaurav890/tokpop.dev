import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitHubSession } from './auth';
import { CONNECTOR_VERSION } from './collector-command';

const mocks = vi.hoisted(() => ({ user: vi.fn(), data: vi.fn() }));
vi.mock('./auth', () => ({ currentGitHubUser: mocks.user }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/runtime-env', () => ({ runtimeEnv: { PUBLIC_APP_URL: 'https://tokpop.dev' } }));
vi.mock('../db/ensure', () => ({ ensureDb: vi.fn() }));
vi.mock('./server-api', () => ({ backendOrigin: () => 'https://example.test', backendJson: mocks.data }));

import ConnectPage from '../app/connect/page';
import ConnectionsPage from '../app/connections/page';
import { PowerUpPanel } from '../app/share/power-up-panel';
import { ActivationShare } from '../app/share/activation-share';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  mocks.user.mockResolvedValue({ userId: 'test', login: 'builder' } as GitHubSession);
  mocks.data.mockResolvedValue({ coverage: [], approvedDevices: 0 });
});

describe('direct tool setup', () => {
  it('replaces setup instructions with a card action after a sync', () => {
    const html = renderToStaticMarkup(React.createElement(PowerUpPanel, { hasCodingEvidence:true, publicOrigin:'https://tokpop.dev' }));
    expect(html).toContain('Your first sync landed');
    expect(html).toContain('View my card');
    expect(html).not.toContain('Copy your setup command');
    expect(html).not.toContain('class="setup-steps"');
  });

  it('explains publishing and the remaining README step before sharing', () => {
    const html = renderToStaticMarkup(React.createElement(ActivationShare, {
      username:'builder', initialSettings:{ publicEnabled:false, leaderboardEnabled:false, comparisonEnabled:false, conversationEnabled:false, storageMode:'managed' },
      profile:{ score:50, scoreEligible:true, activeDays:30, streakDays:3, deliveryPoints:2, providers:['test tool'], lifetimeTokens:100, tokenBreakdown:[], sessions:2, updatedAt:'2026-10-22', archetype:{emoji:'⚡',title:'Builder',summary:'Building'} },
    }));
    expect(html).toContain('This publishes your stats card and opens GitHub');
    expect(html).toContain('Paste it into your GitHub profile README');
    expect(html).toContain('Copy my flex card');
  });
  it('renders an actionable setup flow without a code or a detour through the card', async () => {
    const html = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('id="power-up"');
    expect(html).toContain('Connect my AI tools');
    expect(html).toContain('@builder');
    expect(html).toContain('No project folder needed');
    expect(html).toContain('Automatic updates are optional');
    expect(html).toContain(`ai-native-profile@${CONNECTOR_VERSION}`);
    expect(html).toContain('Missing a tool or stuck?');
    expect(html).not.toContain('Start from your live card');
  });

  it('keeps setup available for connected, partial, and missing sources', async () => {
    mocks.data.mockResolvedValue({ approvedDevices: 1, coverage: [
      { source: 'codex', completeness: 'full', last_synced_at: new Date().toISOString() },
      { source: 'claude_code', completeness: 'partial', last_synced_at: new Date().toISOString() },
    ] });
    const html = renderToStaticMarkup(await ConnectionsPage());
    expect(html).toMatch(/href="\/connect"[^>]*>Connect my tools/);
    expect(html.match(/href="\/connect" class="connection-action">Reconnect \/ add device/g)).toHaveLength(2);
    expect(html).toContain('Connect Cursor');
    const setup = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({}) }));
    expect(setup).toContain('id="power-up"');
  });

  it('returns guests to setup after signing in', async () => {
    mocks.user.mockResolvedValue(null);
    const html = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('/api/auth/github/start?return_to=%2Fconnect');
    expect(html).not.toContain('id="power-up"');
  });

  it('preserves terminal-initiated device approval for members and guests', async () => {
    const searchParams = Promise.resolve({ code: 'TEST1234' });
    const member = renderToStaticMarkup(await ConnectPage({ searchParams }));
    expect(member).toContain('Approve device');
    expect(member).toContain('value="TEST1234"');
    expect(member).not.toContain('id="power-up"');
    mocks.user.mockResolvedValue(null);
    const guest = renderToStaticMarkup(await ConnectPage({ searchParams }));
    expect(guest).toContain('/api/auth/github/start?return_to=%2Fconnect%3Fcode%3DTEST1234');
  });
});
