import { strFromU8, unzipSync } from 'fflate';
import { parseConversationExport, type ExportAggregate } from '@ai-native-profile/adapters';

type ExportFile = { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };
export type ManifestPart = { filename: string; url: string | null };
export type ExportInspection = { kind: 'manifest'; parts: ManifestPart[] } | { kind: 'aggregate'; aggregate: ExportAggregate };
const maxBytes = 100 * 1024 * 1024;

function manifestParts(value: unknown): ManifestPart[] | null {
  if (!value || typeof value !== 'object' || !('data_files' in value) || !Array.isArray(value.data_files)) return null;
  return value.data_files.filter((entry) => entry?.category === 'conversations').map((entry) => {
    const filename = typeof entry.filename === 'string' && /^conversations(?:-\d+)?\.zip$/i.test(entry.filename) ? entry.filename : 'Conversation export ZIP';
    let url: string | null = null;
    try {
      const candidate = new URL(entry.export_url);
      if (candidate.protocol === 'https:' && candidate.hostname === 'claude.ai' && !candidate.port && !candidate.username && !candidate.password && candidate.pathname.startsWith('/export/')) url = candidate.href;
    } catch { /* The manifest can still guide a manual download. */ }
    return { filename, url };
  });
}

// Raw conversations and download URLs stay in the browser worker, never in an aggregate.
export async function inspectExportFiles(source: ExportAggregate['source'], files: ExportFile[]): Promise<ExportInspection> {
  if (!files.length || files.length > 40) throw new Error('Choose between 1 and 40 export files together.');
  if (files.reduce((sum, file) => sum + file.size, 0) > maxBytes) throw new Error('Choose export files totalling less than 100 MB.');
  const conversations: unknown[] = [];
  const seen = new Set<string>();
  const manifests: ManifestPart[] = [];
  let foundManifest = false;
  let jsonBytes = 0;
  function readJson(bytes: Uint8Array) {
    const value: unknown = JSON.parse(strFromU8(bytes));
    const parts = source === 'claude_web' ? manifestParts(value) : null;
    if (parts) { foundManifest = true; manifests.push(...parts); return; }
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const id = source === 'claude_web' ? item.uuid ?? item.id : item.id ?? item.conversation_id;
      const key = typeof id === 'string' && id ? `id:${id}` : `value:${JSON.stringify(item)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      conversations.push(item);
    }
  }
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (/\.json$/i.test(file.name)) {
      jsonBytes += bytes.length;
      if (jsonBytes > maxBytes) throw new Error('Export JSON exceeds the 100 MB local parsing limit.');
      readJson(bytes);
    } else if (/\.zip$/i.test(file.name)) {
      const entries = unzipSync(bytes, { filter(entry) {
        if (!/\.json$/i.test(entry.name)) return false;
        jsonBytes += entry.originalSize;
        if (jsonBytes > maxBytes) throw new Error('Export JSON exceeds the 100 MB local parsing limit.');
        return true;
      } });
      const preferred = Object.entries(entries).filter(([name]) => /(^|\/)conversations(?:[-_]\d+)?\.json$/i.test(name));
      for (const [, content] of preferred.length ? preferred : Object.entries(entries)) readJson(content);
    } else throw new Error('Choose an official export ZIP or JSON file.');
  }
  if (foundManifest) {
    if (conversations.length) throw new Error('Select only the conversation ZIP parts together, without the manifest.');
    return { kind: 'manifest', parts: manifests.filter((part, index) => manifests.findIndex((other) => other.filename === part.filename) === index) };
  }
  return { kind: 'aggregate', aggregate: parseConversationExport(source, conversations) };
}
