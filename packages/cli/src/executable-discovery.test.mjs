import { describe, expect, it } from 'vitest';
import { resolveCodexExecutable } from './codex-executable.mjs';

describe('background executable discovery', () => {
  it('finds the nested macOS app executable without an interactive shell path', () => {
    const executable = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex';
    expect(resolveCodexExecutable({ env: { PATH: '/usr/bin:/bin' }, platform: 'darwin', canExecute: (candidate) => candidate === executable })).toBe(executable);
  });
  it('keeps explicit executable overrides first', () => {
    expect(resolveCodexExecutable({ env: { PATH: '/usr/bin', ANP_CODEX_PATH: '/custom/tool' }, platform: 'darwin', canExecute: () => true })).toBe('/custom/tool');
  });
});
