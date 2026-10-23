import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SiteHeader } from '../app/ui/site-header';
import type { GitHubSession } from './auth';

beforeAll(() => vi.stubGlobal('React', React));
afterAll(() => vi.unstubAllGlobals());

describe('responsive site header', () => {
  it('keeps one named home link in both account states', () => {
    for (const user of [null, { login: 'builder' } as GitHubSession]) {
      const html = renderToStaticMarkup(React.createElement(SiteHeader, { user }));
      expect(html).toMatch(/<a[^>]*href="\/"[^>]*><span class="brand-mark">tokpop.dev<\/span><\/a>/);
      expect(html.match(/class="brand-mark"/g)).toHaveLength(1);
      expect(html).toContain(user ? 'Open account menu for builder' : 'Make my card');
    }
  });

  it('does not apply collapsed sidebar label rules to the public header', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    expect(css).not.toMatch(/(?:^|[;}])\s*\.brand span:last-child/);
    expect(css).not.toMatch(/\.site-header \.dark-brand\s*>?\s*span:last-child\s*\{\s*display:none/);
    expect(css).toContain('.sidebar .brand span:last-child:not(.brand-mark)');
  });

  it('keeps the remaining header action right-aligned even with navigation hidden', () => {
    const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.site-header \.dark-brand\s*\{[^}]*margin-right:auto/);
  });
});
