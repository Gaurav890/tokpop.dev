import { describe, expect, it } from 'vitest';
import { readCodexAccountUsage } from './codex-app-server';
import { codexExecutableCandidates, resolveCodexExecutable } from './codex-executable.mjs';

describe('Codex executable discovery', () => {
  it('prefers an explicit executable override', () => {
    const resolved = resolveCodexExecutable({
      env: { ANP_CODEX_PATH: '/custom/codex', PATH: '/usr/bin' },
      platform: 'linux',
      home: '/home/dev',
      canExecute: (candidate) => candidate === '/custom/codex',
    });
    expect(resolved).toBe('/custom/codex');
  });

  it('checks the desktop app bundle on macOS when the shell path does not contain Codex', () => {
    const candidates = codexExecutableCandidates({ env: { PATH: '/usr/bin' }, platform: 'darwin', home: '/Users/dev' });
    expect(candidates).toContain('/Applications/ChatGPT.app/Contents/Resources/codex');
  });

  it('returns null when no candidate is executable', () => {
    expect(resolveCodexExecutable({ env: { PATH: '/usr/bin' }, platform: 'linux', home: '/home/dev', canExecute: () => false })).toBeNull();
  });

  it('rejects a missing executable without emitting an unhandled child-process error', async () => {
    await expect(readCodexAccountUsage(100, '/definitely/missing/codex')).rejects.toThrow('Could not start Codex App Server');
  });
});
