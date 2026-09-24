import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function discoverLocalDataFiles(candidates, { maxFiles = 10_000 } = {}) {
  const files = [];
  const stack = [...candidates].reverse();
  let truncated = false;

  while (stack.length) {
    const path = stack.pop();
    if (!existsSync(path)) continue;
    let info;
    try { info = lstatSync(path); } catch { continue; }
    if (info.isSymbolicLink()) continue;
    if (info.isFile()) {
      if (/\.(jsonl|json)$/i.test(path)) {
        if (files.length >= maxFiles) { truncated = true; break; }
        files.push(path);
      }
      continue;
    }
    if (!info.isDirectory()) continue;
    let entries;
    try { entries = readdirSync(path).sort((left, right) => left.localeCompare(right)); } catch { continue; }
    for (let index = entries.length - 1; index >= 0; index -= 1) stack.push(join(path, entries[index]));
  }

  return { files, truncated };
}
