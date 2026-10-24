import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
function copyFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return copyFiles(path);
    return /\.(?:tsx?|css|svg)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [path] : [];
  });
}

describe('website copy conventions', () => {
  it('keeps website copy, metadata, and generated cards free of em dashes', () => {
    const files = ['app', 'lib', 'packages/renderers/src', 'public'].flatMap((directory) => copyFiles(join(root, directory)));
    const matches = files.filter((file) => /\u2014|&mdash;|&#0*8212;|&#x0*2014;|\\u2014|\\u\{2014\}/i.test(readFileSync(file, 'utf8')));
    expect(matches.map((file) => relative(root, file))).toEqual([]);
  });

  it('explains missing token totals without presenting them as measured zero', () => {
    const profile = readFileSync(join(root, 'app/u/[username]/page.tsx'), 'utf8');
    expect(profile).toContain("=== undefined ? 'Not reported' : exact(day.bySource[provider.source])");
    expect(profile).toContain('It does not mean zero.');
  });

  it('distinguishes eligible coding history from conversation imports', () => {
    const methodology = readFileSync(join(root, 'app/methodology/page.tsx'), 'utf8');
    expect(methodology).toContain('Eligible history from your coding tools counts immediately.');
    expect(methodology).toContain('Conversation imports, MCP observations, manual entries, and estimated metrics are always excluded.');
  });
});
