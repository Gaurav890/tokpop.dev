import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverLocalDataFiles } from './file-discovery.mjs';

describe('local data discovery', () => {
  it('does not silently stop at the former 300-file boundary', () => {
    const root = mkdtempSync(join(tmpdir(), 'anp-discovery-'));
    const nested = join(root, 'nested');
    mkdirSync(nested);
    for (let index = 0; index < 305; index += 1) {
      writeFileSync(join(nested, `${String(index).padStart(3, '0')}.jsonl`), '{}\n');
    }
    expect(discoverLocalDataFiles([root]).files).toHaveLength(305);
  });

  it('is deterministic, reports explicit truncation, and skips symlinks', () => {
    const root = mkdtempSync(join(tmpdir(), 'anp-discovery-'));
    writeFileSync(join(root, 'b.json'), '{}');
    writeFileSync(join(root, 'a.jsonl'), '{}\n');
    symlinkSync(join(root, 'a.jsonl'), join(root, 'linked.jsonl'));
    const result = discoverLocalDataFiles([root], { maxFiles: 1 });
    expect(result.files.map((file) => file.split('/').at(-1))).toEqual(['a.jsonl']);
    expect(result.truncated).toBe(true);
  });
});
