import { describe, expect, it } from 'vitest';
import { authReturnPath } from './auth-return-path';

const origin = 'https://tokpop.dev';

describe('authentication return path', () => {
  it.each([
    undefined, null, '', 'https://example.com', '//example.com', '/\\example.com',
    '/\t/example.com', '/\n/example.com', '/\r/example.com', ' /share',
    '/%5cexample.com', '/%2fexample.com', '/%255cexample.com', '/%0a/example.com',
    '/a/..//example.com',
  ])('rejects unsafe return destination %j', (value) => {
    expect(authReturnPath(value, origin)).toBe('/dashboard');
  });

  it.each(['/', '/share?onboarding=1', '/dashboard#activity', '/u/Gaurav890', '/share?next=https%3A%2F%2Fexample.com'])('preserves local destination %s', (value) => {
    expect(authReturnPath(value, origin)).toBe(value);
    expect(new URL(authReturnPath(value, origin), origin).origin).toBe(origin);
  });
});
