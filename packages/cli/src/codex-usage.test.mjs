import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';
import { addUsageEvent, collectUsage, createUsageAccumulator, finalizeUsage, localUsageRoots, readLocalUsage } from './codex-usage.mjs';
import { validateActivityBatch } from '../../schema/src/index.ts';

const event = (total, last = total, timestamp = '2026-10-20T12:00:00Z') => ({
  timestamp, type:'event_msg', payload:{ type:'token_count', info:{
    total_token_usage:{ total_tokens:total, cached_input_tokens:80, reasoning_output_tokens:10 },
    last_token_usage:{ total_tokens:last },
  } },
});
const meta = (id, timestamp = '2026-10-20T00:00:00Z') => ({ type:'session_meta', payload:{ id, timestamp, cwd:'PRIVATE_PATH', base_instructions:'PRIVATE_PROMPT' } });
const total = (daily) => daily.reduce((sum, day) => sum + day.metrics[0].value, 0);
function parse(events) {
  const accumulator = createUsageAccumulator();
  const file = { id:'one', started:null };
  for (const item of events) addUsageEvent(accumulator, file, item);
  return finalizeUsage(accumulator);
}

describe('retained session usage', () => {
  it('counts cumulative increments across days without adding cache or reasoning twice', () => {
    const daily = parse([meta('one'), event(100), event(100), event(150, 50, '2026-10-21T12:00:00Z')]);
    expect(daily.map((day) => day.metrics[0].value)).toEqual([100, 50]);
    expect(daily[0].metrics[0].provenance).toBe('local_derived');
  });
  it('sorts out-of-order records and ignores repeated snapshots at different times', () => {
    expect(total(parse([event(150, 50, '2026-10-21T12:00:00Z'), event(100), event(100, 100, '2026-10-20T13:00:00Z')]))).toBe(150);
  });
  it('does not invent a daily total from unretained history', () => {
    expect(total(parse([event(1000, 25), event(1050, 50, '2026-10-21T12:00:00Z')]))).toBe(75);
    expect(parse([event(1000, null)])).toEqual([]);
  });
  it('handles counter resets using only the reported last request', () => {
    expect(total(parse([event(100), event(30, 30, '2026-10-21T12:00:00Z'), event(50, 20, '2026-10-21T13:00:00Z')]))).toBe(150);
  });
  it('does not recount inherited history in a fork', () => {
    expect(total(parse([meta('fork', '2026-10-21T00:00:00Z'), event(100), event(150, 50, '2026-10-21T12:00:00Z')]))).toBe(50);
  });
  it('ignores null, negative, invalid and content-only records', () => {
    expect(parse([event(-1), event(null), event(1.5), event(100, 100, 'invalid'), { type:'response_item', payload:{ text:'PRIVATE_PROMPT' } }])).toEqual([]);
  });
  it('discovers archived sessions and deduplicates copies with the same session identity', async () => {
    const home = mkdtempSync(join(tmpdir(), 'usage-test-'));
    try {
      const roots = localUsageRoots(home, {});
      for (const root of roots) mkdirSync(root, { recursive:true });
      const content = [meta('same'), event(100), event(150, 50, '2026-10-21T12:00:00Z')].map(JSON.stringify).join('\n');
      writeFileSync(join(roots[0], 'first.jsonl'), content);
      writeFileSync(join(roots[1], 'copy.jsonl'), content + '\n{invalid');
      const result = await readLocalUsage(roots);
      expect(total(result.daily)).toBe(150);
      expect(result.completeness).toBe('partial');
      expect(result.note).toContain('malformed');
      expect(JSON.stringify(result)).not.toMatch(/PRIVATE|first.jsonl|same/);
    } finally { rmSync(home, { recursive:true, force:true }); }
  });
  it('honors a custom data root', () => {
    expect(localUsageRoots('/home/person', { CODEX_HOME:'/custom' })).toEqual(['/custom/sessions', '/custom/archived_sessions']);
  });
});

describe('account usage compatibility', () => {
  const local = { daily:parse([event(100)]), completeness:'partial', note:'Retained history only.' };
  it('falls back on the exact unsupported-method error', async () => {
    const result = await collectUsage({ readAccount:async () => { throw new Error('Invalid request: unknown variant `account/usage/read`'); }, readLocal:async () => local });
    expect(result).toMatchObject({ ...local, fallback:true });
  });
  it('falls back when the API returns no daily buckets', async () => {
    expect((await collectUsage({ readAccount:async () => [], readLocal:async () => local })).daily).toEqual(local.daily);
  });
  it('never adds local totals to account totals', async () => {
    const readLocal = vi.fn();
    const result = await collectUsage({ readAccount:async () => local.daily, readLocal });
    expect(total(result.daily)).toBe(100);
    expect(result.fallback).toBe(false);
    expect(readLocal).not.toHaveBeenCalled();
  });
  it('reports unavailable data instead of manufacturing a zero', async () => {
    await expect(collectUsage({ readAccount:async () => { throw new Error('unsupported'); }, readLocal:async () => ({ daily:[] }) })).rejects.toThrow('no retained local token records');
  });
  it('runs the full preview command against an incompatible server and produces a valid private-safe batch', () => {
    const home = mkdtempSync(join(tmpdir(), 'collector-compat-'));
    try {
      const executable = join(home, 'test-server');
      writeFileSync(executable, `#!${process.execPath}\nimport {createInterface} from 'node:readline';\nfor await (const line of createInterface({input:process.stdin})) { const request=JSON.parse(line); if(request.id) console.log(JSON.stringify(request.method==='initialize' ? {id:request.id,result:{}} : {id:request.id,error:{message:'Invalid request: unknown variant account/usage/read'}})); }\n`, { mode:0o700 });
      const [root] = localUsageRoots(home, {});
      mkdirSync(root, { recursive:true });
      writeFileSync(join(root, 'session.jsonl'), [meta('one'), event(100), event(150, 50, '2026-10-21T12:00:00Z')].map(JSON.stringify).join('\n'));
      const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/anp.mjs', import.meta.url)), 'preview'], {
        encoding:'utf8', timeout:15_000, env:{ ...process.env, HOME:home, CODEX_HOME:join(home, '.codex'), ANP_CODEX_PATH:executable },
      });
      expect(result.status, result.stderr).toBe(0);
      const batch = JSON.parse(result.stdout);
      expect(validateActivityBatch(batch).ok).toBe(true);
      expect(total(batch.daily)).toBe(150);
      expect(batch.coverage[0].completeness).toBe('partial');
      expect(result.stderr).toContain('using retained local token records');
      expect(result.stdout).not.toMatch(/PRIVATE|test-server|session.jsonl/);
    } finally { rmSync(home, { recursive:true, force:true }); }
  });
});
