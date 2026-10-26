/// <reference lib="webworker" />
import { inspectExportFiles } from '../../lib/browser-export';

self.onmessage = async (event: MessageEvent<{ files: File[]; source: 'chatgpt_web' | 'claude_web' }>) => {
  try {
    const result = await inspectExportFiles(event.data.source, event.data.files);
    self.postMessage({ ok: true, result });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Export parsing failed.' });
  }
};
