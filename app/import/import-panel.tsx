'use client';

import { useRef, useState } from 'react';
import type { ExportAggregate } from '@ai-native-profile/adapters';

export function ImportPanel() {
  const [source, setSource] = useState<ExportAggregate['source']>('chatgpt_web');
  const [status, setStatus] = useState('Choose an official export ZIP. Nothing is uploaded yet.');
  const [aggregate, setAggregate] = useState<ExportAggregate | null>(null);
  const worker = useRef<Worker | null>(null);

  async function inspect(file?: File) {
    if (!file) return;
    setStatus('Parsing locally in your browser…');
    setAggregate(null);
    worker.current?.terminate();
    worker.current = new Worker(new URL('./export-worker.ts', import.meta.url), { type: 'module' });
    worker.current.onmessage = (event: MessageEvent<{ ok: boolean; aggregate?: ExportAggregate; error?: string }>) => {
      if (!event.data.ok || !event.data.aggregate) return setStatus(event.data.error ?? 'Could not parse this export.');
      setAggregate(event.data.aggregate);
      setStatus(`Ready: ${event.data.aggregate.days.length} aggregate days. Review before committing.`);
    };
    worker.current.postMessage({ file, source });
  }

  async function commit() {
    if (!aggregate) return;
    setStatus('Committing approved aggregates…');
    const response = await fetch('/api/v1/imports/aggregate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(aggregate) });
    const body = await response.json().catch(() => ({})) as { acceptedDays?: number; error?: string };
    setStatus(response.ok ? `Imported ${body.acceptedDays} aggregate days. Raw content never left this browser.` : body.error ?? 'Import failed.');
    if (response.ok) setAggregate(null);
  }

  return <section className="import-box">
    <div className="provider-toggle" aria-label="Export provider">
      <button className={source === 'chatgpt_web' ? 'active' : ''} onClick={() => setSource('chatgpt_web')}>ChatGPT</button>
      <button className={source === 'claude_web' ? 'active' : ''} onClick={() => setSource('claude_web')}>Claude</button>
    </div>
    <label className="drop-zone">
      <strong>Drop an official {source === 'chatgpt_web' ? 'ChatGPT' : 'Claude'} export ZIP</strong>
      <span>Parsing happens in a Web Worker on this device.</span>
      <input type="file" accept=".zip,application/zip" onChange={(event) => inspect(event.target.files?.[0])} />
    </label>
    <p className="status-line">{status}</p>
    {aggregate && <div className="import-preview"><div><span>Coverage</span><strong>{aggregate.coverageStart} → {aggregate.coverageEnd}</strong></div><div><span>Sessions</span><strong>{aggregate.days.reduce((sum, day) => sum + day.sessions, 0)}</strong></div><div><span>Turns</span><strong>{aggregate.days.reduce((sum, day) => sum + day.turns, 0)}</strong></div><button className="primary-button" onClick={commit}>Approve aggregates</button></div>}
  </section>;
}
