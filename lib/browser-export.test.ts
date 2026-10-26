import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { inspectExportFiles } from './browser-export';

const conversation = (uuid: string, date = '2026-10-25') => ({ uuid, created_at: `${date}T12:00:00Z`, chat_messages: [{ text: 'PRIVATE CANARY' }] });
const json = (value: unknown, name = 'export.json') => new File([JSON.stringify(value)], name);
const zip = (value: unknown, name = 'conversations-000.zip', entry = 'conversations.json') => new File([Uint8Array.from(zipSync({ [entry]: strToU8(JSON.stringify(value)) })).buffer], name);
const manifest = { data_files: [
  { category: 'memories', filename: 'memories-000.zip', export_url: 'https://claude.ai/export/memory' },
  { category: 'conversations', filename: 'conversations-000.zip', export_url: 'https://claude.ai/export/part0?token=PRIVATE' },
  { category: 'conversations', filename: 'conversations-001.zip', export_url: 'https://claude.ai/export/part1' },
] };

describe('local export inspection', () => {
  it.each(['json', 'zip'])('recognizes a Claude manifest in %s without importing it', async (format) => {
    const result = await inspectExportFiles('claude_web', [format === 'json' ? json(manifest) : zip(manifest, 'export.zip', 'data.json')]);
    expect(result).toEqual({ kind: 'manifest', parts: manifest.data_files.slice(1).map((part) => ({ filename: part.filename, url: part.export_url })) });
    expect(result).not.toHaveProperty('aggregate');
  });
  it.each(['javascript:alert(1)', 'https://evil.test/export/part', 'https://claude.ai.evil.test/export/part', 'http://claude.ai/export/part', 'https://user:secret@claude.ai/export/part', 'https://claude.ai:8443/export/part', 'https://claude.ai/settings'])('does not offer unsafe download URL %s', async (url) => {
    const result = await inspectExportFiles('claude_web', [json({ data_files: [{ category: 'conversations', filename: 'conversations-000.zip', export_url: url }] })]);
    expect(result).toEqual({ kind: 'manifest', parts: [{ filename: 'conversations-000.zip', url: null }] });
  });
  it('merges ZIP parts and deduplicates conversation IDs and repeated files', async () => {
    const result = await inspectExportFiles('claude_web', [zip([conversation('a')]), zip([conversation('a'), conversation('b'), conversation('c', '2026-10-26')], 'conversations-001.zip')]);
    expect(result).toEqual({ kind: 'aggregate', aggregate: { source: 'claude_web', coverageStart: '2026-10-25', coverageEnd: '2026-10-26', days: [{ date: '2026-10-25', sessions: 2, turns: 2 }, { date: '2026-10-26', sessions: 1, turns: 1 }] } });
    expect(JSON.stringify(result)).not.toContain('PRIVATE');
  });
  it('does not count metadata as conversations', async () => {
    await expect(inspectExportFiles('claude_web', [json([{ created_at: '2026-10-25', title: 'project' }, null])])).rejects.toThrow('No dated conversations');
  });
  it('does not silently import only a subset when a manifest is selected with data', async () => {
    await expect(inspectExportFiles('claude_web', [json(manifest), zip([conversation('a')])])).rejects.toThrow('without the manifest');
  });
  it('handles no conversation entries and malformed input', async () => {
    expect(await inspectExportFiles('claude_web', [json({ data_files: [] })])).toEqual({ kind: 'manifest', parts: [] });
    await expect(inspectExportFiles('claude_web', [new File(['not json'], 'export.json')])).rejects.toThrow();
    await expect(inspectExportFiles('claude_web', [new File(['broken'], 'export.zip')])).rejects.toThrow();
  });
  it('keeps existing single-archive imports working', async () => {
    const result = await inspectExportFiles('chatgpt_web', [zip([{ id: 'one', create_time: 1725523200, mapping: { a: { message: { content: 'PRIVATE' } } } }])]);
    expect(result.kind === 'aggregate' && result.aggregate.days).toEqual([{ date: '2024-09-05', sessions: 1, turns: 1 }]);
  });
  it('limits file count and total upload size before reading', async () => {
    await expect(inspectExportFiles('claude_web', Array.from({ length: 41 }, () => json([])))).rejects.toThrow('40');
    await expect(inspectExportFiles('claude_web', [{ name: 'large.zip', size: 101 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) }])).rejects.toThrow('100 MB');
  });
});
