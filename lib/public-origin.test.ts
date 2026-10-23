import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_PUBLIC_ORIGIN, publicAppOrigin } from './public-origin';
import { collectorConnectCommand } from './collector-command';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('domain migration', () => {
  it('keeps the old host as a working fallback until cutover', () => {
    expect(publicAppOrigin()).toBe(LEGACY_PUBLIC_ORIGIN);
    expect(publicAppOrigin(' https://tokpop.dev/ ')).toBe('https://tokpop.dev');
    expect(publicAppOrigin('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it.each(['http://tokpop.dev', 'https://tokpop.dev/share', 'https://user:pass@tokpop.dev', 'https://tokpop.dev?x=1', 'https://tokpop.dev/#x', 'javascript:alert(1)'])('rejects a non-origin setting: %s', (value) => {
    expect(() => publicAppOrigin(value)).toThrow();
  });

  it('uses the published executable and explicit custom origin for pairing', () => {
    expect(collectorConnectCommand('AAF_BL68', 'https://tokpop.dev/')).toBe("npm exec --yes --package=ai-native-profile@0.2.3 -- ai-native-profile connect --code AAF_BL68 --api-url 'https://tokpop.dev'");
    expect(() => collectorConnectCommand('code;exit', 'https://tokpop.dev')).toThrow();
  });

  it('redirects only legacy sign-in before cookies are set, preserving old APIs', async () => {
    vi.stubEnv('PUBLIC_APP_URL', 'https://tokpop.dev/');
    vi.stubEnv('BACKEND_URL', 'https://backend.example');
    const { default: config } = await import('../next.config');
    expect(await config.redirects!()).toEqual([{
      source: '/api/auth/github/start',
      has: [{ type: 'host', value: 'ai-native-profile.vercel.app' }],
      destination: 'https://tokpop.dev/api/auth/github/start',
      permanent: false,
    }]);
    expect(await config.rewrites!()).toMatchObject({ beforeFiles: expect.arrayContaining([
      { source: '/api/:path*', destination: 'https://backend.example/api/:path*' },
    ]) });
  });

  it('does not redirect when the old production origin is still configured', async () => {
    vi.stubEnv('PUBLIC_APP_URL', LEGACY_PUBLIC_ORIGIN);
    const { default: config } = await import('../next.config');
    expect(await config.redirects!()).toEqual([]);
  });
});
