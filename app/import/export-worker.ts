/// <reference lib="webworker" />
import { strFromU8, unzipSync } from 'fflate';
import { parseConversationExport } from '@ai-native-profile/adapters';

self.onmessage = async (event: MessageEvent<{ file: File; source: 'chatgpt_web' | 'claude_web' }>) => {
  try {
    const archive = unzipSync(new Uint8Array(await event.data.file.arrayBuffer()));
    const preferred = event.data.source === 'chatgpt_web' ? /(^|\/)conversations\.json$/i : /(^|\/)(conversations|data).*\.json$/i;
    const entry = Object.entries(archive).find(([name]) => preferred.test(name)) ?? Object.entries(archive).find(([name]) => name.endsWith('.json'));
    if (!entry) throw new Error('No supported conversation JSON file was found in the ZIP.');
    const parsed = JSON.parse(strFromU8(entry[1]));
    const aggregate = parseConversationExport(event.data.source, parsed);
    self.postMessage({ ok: true, aggregate });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Export parsing failed.' });
  }
};
