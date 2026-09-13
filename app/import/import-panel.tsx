'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { ExportAggregate } from '@ai-native-profile/adapters';
import Link from '../ui/native-link';

const exportGuides = {
  chatgpt_web: {
    name: 'ChatGPT',
    href: 'https://help.openai.com/en/articles/7260999-how-do-i-export-my-chat-history-and-data',
    steps: ['Open your profile menu, then Settings.', 'Choose Data Controls → Export Data → Confirm export.', 'Download the ZIP from the email, then choose or drop it below.'],
    timing: 'The export can take up to 7 days. The email download link expires after 24 hours.',
  },
  claude_web: {
    name: 'Claude',
    href: 'https://support.anthropic.com/en/articles/9450526-how-can-i-export-my-claude-data',
    steps: ['Open your initials menu, then Settings.', 'Choose Privacy → Export data.', 'Download the ZIP from the email, then choose or drop it below.'],
    timing: 'Claude may take a short time to prepare the export. The email download link expires after 24 hours.',
  },
} as const;

export function ImportPanel({ initialSource = 'chatgpt_web', onboarding = false }: { initialSource?: ExportAggregate['source']; onboarding?: boolean }) {
  const [source, setSource] = useState<ExportAggregate['source']>(initialSource);
  const [status, setStatus] = useState('Choose an official export ZIP. Nothing is uploaded yet.');
  const [aggregate, setAggregate] = useState<ExportAggregate | null>(null);
  const [completed, setCompleted] = useState(false);
  const worker = useRef<Worker | null>(null);
  const guide = exportGuides[source];

  useEffect(() => () => worker.current?.terminate(), []);

  function selectSource(nextSource: ExportAggregate['source']) {
    worker.current?.terminate();
    setSource(nextSource);
    setAggregate(null);
    setCompleted(false);
    setStatus(`Choose an official ${exportGuides[nextSource].name} export ZIP. Nothing is uploaded yet.`);
  }

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

  function dropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void inspect(event.dataTransfer.files[0]);
  }

  async function commit() {
    if (!aggregate) return;
    setStatus('Committing approved aggregates…');
    const response = await fetch('/api/v1/imports/aggregate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(aggregate) });
    const body = await response.json().catch(() => ({})) as { acceptedDays?: number; error?: string };
    setStatus(response.ok ? `Imported ${body.acceptedDays} aggregate days. Raw content never left this browser.` : body.error ?? 'Import failed.');
    if (response.ok) {
      setAggregate(null);
      setCompleted(true);
    }
  }

  return <section className="import-box">
    <div className="provider-toggle" aria-label="Export provider">
      <button type="button" className={source === 'chatgpt_web' ? 'active' : ''} aria-pressed={source === 'chatgpt_web'} onClick={() => selectSource('chatgpt_web')}>ChatGPT</button>
      <button type="button" className={source === 'claude_web' ? 'active' : ''} aria-pressed={source === 'claude_web'} onClick={() => selectSource('claude_web')}>Claude</button>
    </div>
    <div className="export-guide">
      <div className="export-guide-head"><div><p className="eyebrow">Get the archive</p><h2>Export from {guide.name}</h2></div><a href={guide.href} target="_blank" rel="noreferrer">Official instructions ↗</a></div>
      <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
      <p>{guide.timing}</p>
    </div>
    <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
      <strong>Choose or drop the official {guide.name} export ZIP</strong>
      <span>Parsing happens in a Web Worker on this device.</span>
      <input type="file" accept=".zip,application/zip" onChange={(event) => inspect(event.target.files?.[0])} />
    </label>
    <p className="status-line" aria-live="polite">{status}</p>
    {aggregate ? <div className="import-preview"><div><span>Coverage</span><strong>{aggregate.coverageStart} → {aggregate.coverageEnd}</strong></div><div><span>Sessions</span><strong>{aggregate.days.reduce((sum, day) => sum + day.sessions, 0)}</strong></div><div><span>Turns</span><strong>{aggregate.days.reduce((sum, day) => sum + day.turns, 0)}</strong></div><button type="button" className="primary-button" onClick={commit}>Approve aggregates</button></div> : null}
    {completed && onboarding ? <div className="import-complete"><div><strong>AI activity source connected</strong><span>Your approved aggregates are ready to review.</span></div><Link className="primary-link compact-link" href="/dashboard">Open my dashboard →</Link></div> : null}
  </section>;
}
