import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
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
    expect(backgroundSyncStatus({ homeDir, platform: 'darwin' }).installed).toBe(true);
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
