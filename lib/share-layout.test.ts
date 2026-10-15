import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoProfile } from './demo-profile';
import { SyncHealth } from '../app/ui/sync-health';

const mocks = vi.hoisted(() => ({ profile: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('@/lib/runtime-env', () => ({ runtimeEnv: {} }));
vi.mock('../db/ensure', () => ({ ensureDb: vi.fn() }));
vi.mock('./auth', () => ({ currentGitHubUser: async () => ({ userId: 'test', login: 'demo' }) }));
vi.mock('./profile', () => ({ getPrivateProfile: mocks.profile }));
vi.mock('./server-api', () => ({ backendOrigin: () => 'https://example.test', backendJson: async () => ({ settings: { public_enabled: 1 } }) }));
vi.mock('../app/ui/site-header', () => ({ SiteHeader: () => null }));
vi.mock('../app/ui/site-footer', () => ({ SiteFooter: () => null }));
vi.mock('../app/share/power-up-panel', () => ({ PowerUpPanel: () => React.createElement('section', { id: 'power-up' }, 'Connect my tools') }));

import SharePage from '../app/share/page';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => mocks.profile.mockResolvedValue({ ...demoProfile, verified: true }));

describe('share page prioritizes the card', () => {
  it('puts sharing before connection diagnostics for connected users', async () => {
    const html = renderToStaticMarkup(await SharePage());
    expect(html.indexOf('activation-grid')).toBeLessThan(html.indexOf('share-connection-status'));
    expect(html).not.toContain('Starter stats loaded');
    expect(html).not.toContain('id="power-up"');
    expect(html).toContain('href="/connections">Manage');
    expect(html).not.toContain('Source sync health');
  });
  it('keeps the connection step first for a new user', async () => {
    mocks.profile.mockResolvedValue({ ...demoProfile, providers: [], verified: true });
    const html = renderToStaticMarkup(await SharePage());
    expect(html.indexOf('id="power-up"')).toBeLessThan(html.indexOf('activation-grid'));
    expect(html).toContain('href="#power-up"');
  });
  it('keeps missing timestamps neutral and compact', () => {
    const html = renderToStaticMarkup(React.createElement(SyncHealth, { profile: { ...demoProfile, verified: true }, compact: true, owner: true }));
    expect(html).toContain('Sync timing is not available yet');
    expect(html).not.toContain('delayed');
    expect(html).not.toContain('<dl');
  });
});
