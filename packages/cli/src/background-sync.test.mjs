import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BACKGROUND_INTERVAL_SECONDS,
  backgroundSyncPaths,
  backgroundSyncStatus,
  installBackgroundSync,
  renderLaunchAgent,
  renderSystemdUnits,
  uninstallBackgroundSync,
  runWithSyncState,
} from './background-sync.mjs';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe('automatic background sync', () => {
  it('renders an explicit 15-minute macOS job', () => {
    const plist = renderLaunchAgent({ nodePath: '/opt/node', cliPath: '/tmp/anp.mjs', logPath: '/tmp/anp.log' });
    expect(plist).toContain('<string>/opt/node</string><string>/tmp/anp.mjs</string><string>sync</string>');
    expect(plist).toContain(`<integer>${BACKGROUND_INTERVAL_SECONDS}</integer>`);
    expect(plist).toContain('<key>RunAtLoad</key><true/>');
  });

  it('installs a self-contained macOS collector and removes it cleanly', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'anp-background-'));
    const calls = [];
    const runner = (command, args) => {
      calls.push([command, ...args]);
      return { status: 0, stdout: '', stderr: '' };
    };
    const result = installBackgroundSync({ sourceRoot: packageRoot, homeDir, platform: 'darwin', nodePath: '/opt/node', uid: 501, runner });
    const paths = backgroundSyncPaths({ homeDir, platform: 'darwin' });
    expect(result.installed).toBe(true);
    expect(backgroundSyncStatus({ homeDir, platform: 'darwin', runner }).installed).toBe(true);
    expect(existsSync(join(paths.collectorRoot, 'src', 'claude-usage.mjs'))).toBe(true);
    expect(readFileSync(paths.definition, 'utf8')).toContain(join(paths.collectorRoot, 'bin', 'anp.mjs'));
    expect(calls.some((call) => call[0] === 'launchctl' && call[1] === 'bootstrap')).toBe(true);

    uninstallBackgroundSync({ homeDir, platform: 'darwin', uid: 501, runner });
    expect(existsSync(paths.definition)).toBe(false);
    expect(existsSync(paths.collectorRoot)).toBe(false);
  });

  it('renders a persistent Linux user timer', () => {
    const units = renderSystemdUnits({ nodePath: '/usr/bin/node', cliPath: '/tmp/anp.mjs' });
    expect(units.service).toContain('sync --background');
    expect(units.timer).toContain(`OnUnitActiveSec=${BACKGROUND_INTERVAL_SECONDS}s`);
    expect(units.timer).toContain('Persistent=true');
  });

  it('does not install collector files on unsupported systems', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'anp-background-'));
    const result = installBackgroundSync({ sourceRoot: packageRoot, homeDir, platform: 'win32' });
    expect(result.installed).toBe(false);
    expect(existsSync(backgroundSyncPaths({ homeDir, platform: 'win32' }).collectorRoot)).toBe(false);
  });
});

describe('background health', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const loaded = () => ({ status: 0 });
  function setup() {
    const homeDir = mkdtempSync(join(tmpdir(), 'sync-health-'));
    installBackgroundSync({ homeDir, platform: 'darwin', sourceRoot: packageRoot, runner: loaded });
    return homeDir;
  }
  const status = (homeDir, runner = loaded, time = now.getTime()) => backgroundSyncStatus({ homeDir, platform: 'darwin', runner, now: time });

  it('does not confuse a configuration file with a loaded job', () => {
    expect(status(setup(), () => ({ status: 113 }))).toMatchObject({ installed: true, scheduled: false, health: 'not loaded' });
  });
  it('does not call an unobserved job healthy', () => {
    expect(status(setup()).health).toBe('not yet verified');
  });
  it('records successful background uploads separately from manual uploads', async () => {
    const homeDir = setup();
    await runWithSyncState(async () => {}, { homeDir, now: () => now });
    expect(status(homeDir).health).toBe('not yet verified');
    await runWithSyncState(async () => {}, { homeDir, background: true, now: () => now });
    expect(status(homeDir)).toMatchObject({ health: 'healthy', lastSuccessAt: now.toISOString() });
    expect(status(homeDir, loaded, now.getTime() + 46 * 60_000).health).toBe('stale');
  });
  it('preserves last success after an upload failure without persisting raw errors', async () => {
    const homeDir = setup();
    const options = { homeDir, background: true, now: () => now };
    await runWithSyncState(async () => {}, options);
    await expect(runWithSyncState(async () => { throw new Error('secret credentials'); }, options)).rejects.toThrow();
    expect(status(homeDir)).toMatchObject({ health: 'failed', lastSuccessAt: now.toISOString() });
    expect(readFileSync(join(backgroundSyncPaths({ homeDir }).configDir, 'background-status.json'), 'utf8')).not.toContain('secret');
  });
  it('marks successful uploads with skipped sources partial', async () => {
    const homeDir = setup();
    await runWithSyncState(async () => ({ warnings: ['codex'] }), { homeDir, background: true, now: () => now });
    expect(status(homeDir)).toMatchObject({ health: 'partial', skippedSources: ['codex'] });
  });
  it('treats a corrupt health file as unverified', () => {
    const homeDir = setup();
    writeFileSync(join(backgroundSyncPaths({ homeDir }).configDir, 'background-status.json'), '{');
    expect(status(homeDir).health).toBe('not yet verified');
  });
  it('checks Linux timer activation', async () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'sync-linux-'));
    const calls = [];
    const runner = (cmd, args) => { calls.push([cmd, ...args]); return { status: 0 }; };
    installBackgroundSync({ homeDir, platform: 'linux', sourceRoot: packageRoot, runner });
    await runWithSyncState(async () => {}, { homeDir, background: true, now: () => now });
    expect(backgroundSyncStatus({ homeDir, platform: 'linux', runner, now: now.getTime() }).health).toBe('healthy');
    expect(calls).toContainEqual(['systemctl', '--user', 'is-active', 'ai-native-profile-sync.timer']);
  });
  it('preserves only explicit executable environment in scheduler definitions', () => {
    const environment = { PATH: '/opt/bin:/usr/bin', ANP_CODEX_PATH: '/app with space/bin' };
    expect(renderLaunchAgent({ nodePath: '/node', cliPath: '/cli', logPath: '/log', environment })).toContain('<key>ANP_CODEX_PATH</key><string>/app with space/bin</string>');
    expect(renderSystemdUnits({ nodePath: '/node', cliPath: '/cli', environment }).service).toContain('Environment="ANP_CODEX_PATH=/app with space/bin"');
  });
});
