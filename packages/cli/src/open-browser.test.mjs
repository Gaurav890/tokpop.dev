import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { openApprovalBrowser } from './open-browser.mjs';

const url = 'https://tokpop.dev/connect?code=TEST_ONLY';
function options(extra = {}) {
  const spawnProcess = vi.fn(() => {
    const child = new EventEmitter();
    child.unref = vi.fn();
    queueMicrotask(() => child.emit('exit', 0));
    return child;
  });
  return { allowedOrigin: 'https://tokpop.dev', interactive: true, env: {}, platform: 'darwin', spawnProcess, ...extra };
}

describe('approval browser opening', () => {
  it.each([
    ['darwin', 'open', [url]],
    ['win32', 'rundll32.exe', ['url.dll,FileProtocolHandler', url]],
    ['linux', 'xdg-open', [url]],
  ])('opens the prefilled URL on %s without a shell', async (platform, executable, args) => {
    const opts = options({ platform });
    expect(await openApprovalBrowser(url, opts)).toBe(true);
    expect(opts.spawnProcess).toHaveBeenCalledWith(executable, args, expect.objectContaining({ shell: false, stdio: 'ignore' }));
  });

  it.each([{ disabled: true }, { interactive: false }, { env: { SSH_CONNECTION: 'remote' } }, { env: { SSH_TTY: '/dev/pts/0' } }, { env: { CI: 'true' } }, { platform: 'unsupported' }])('leaves manual approval available for %j', async (extra) => {
    const opts = options(extra);
    expect(await openApprovalBrowser(url, opts)).toBe(false);
    expect(opts.spawnProcess).not.toHaveBeenCalled();
  });

  it.each(['file:///tmp/example', 'javascript:alert(1)', 'https://other.example/connect?code=TEST_ONLY', 'https://name:secret@tokpop.dev/connect', 'not a url', 'http://tokpop.dev/connect'])('does not launch unsafe or unexpected URL %s', async (value) => {
    const opts = options();
    expect(await openApprovalBrowser(value, opts)).toBe(false);
    expect(opts.spawnProcess).not.toHaveBeenCalled();
  });

  it('supports a local development server', async () => {
    expect(await openApprovalBrowser('http://localhost:3000/connect?code=TEST', options({ allowedOrigin: 'http://localhost:3000' }))).toBe(true);
  });

  it.each(['error', 'exit', 'timeout', 'throw'])('falls back instead of blocking pairing on %s', async (failure) => {
    const spawnProcess = () => {
      if (failure === 'throw') throw new Error('Unavailable');
      const child = new EventEmitter();
      child.unref = vi.fn();
      queueMicrotask(() => {
        if (failure === 'error') child.emit('error', new Error('Missing executable'));
        if (failure === 'exit') child.emit('exit', 1);
      });
      return child;
    };
    expect(await openApprovalBrowser(url, options({ spawnProcess, timeoutMs: 10 }))).toBe(false);
  });

  it('includes the browser helper in the published package', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.files).toContain('src/open-browser.mjs');
  });
});
