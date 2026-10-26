'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import type { ExportAggregate } from '@ai-native-profile/adapters';
import type { ExportInspection, ManifestPart } from '../../lib/browser-export';
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
    steps: ['Open your initials menu, then Settings → Privacy → Export data.', 'Open the export email. If it gives you a manifest JSON, choose that file below to find the conversation downloads.', 'Download every conversations ZIP part, starting with conversations-000.zip. Select all parts together below. You do not need memories, projects, or metadata.'],
    timing: 'Download links can expire. Request a fresh export if a link no longer works. The manifest lists downloads; it does not contain your conversations.',
  },
} as const;

export function ImportPanel({ initialSource = 'chatgpt_web', onboarding = false }: { initialSource?: ExportAggregate['source']; onboarding?: boolean }) {
  const [source, setSource] = useState<ExportAggregate['source']>(initialSource);
  const [status, setStatus] = useState('Choose an official export ZIP or JSON. Nothing is uploaded yet.');
  const [aggregate, setAggregate] = useState<ExportAggregate | null>(null);
  const [completed, setCompleted] = useState(false);
  const [parts, setParts] = useState<ManifestPart[] | null>(null);
  const [saving, setSaving] = useState(false);
  const worker = useRef<Worker | null>(null);
  const guide = exportGuides[source];

  useEffect(() => () => worker.current?.terminate(), []);

  function selectSource(nextSource: ExportAggregate['source']) {
    if (saving) return;
    worker.current?.terminate();
    worker.current = null;
    setSource(nextSource);
    setAggregate(null);
    setCompleted(false);
    setParts(null);
    setStatus(`Choose an official ${exportGuides[nextSource].name} export ZIP or JSON. Nothing is uploaded yet.`);
  }

  function inspect(files: File[]) {
    if (!files.length || saving) return;
    setStatus('Parsing locally in your browser…');
    setAggregate(null);
    setParts(null);
    setCompleted(false);
    worker.current?.terminate();
    const activeWorker = new Worker(new URL('./export-worker.ts', import.meta.url), { type: 'module' });
    worker.current = activeWorker;
    activeWorker.onmessage = (event: MessageEvent<{ ok: boolean; result?: ExportInspection; error?: string }>) => {
      if (worker.current !== activeWorker) return;
      activeWorker.terminate();
      if (!event.data.ok || !event.data.result) return setStatus(event.data.error ?? 'Could not parse this export.');
      if (event.data.result.kind === 'manifest') {
        setParts(event.data.result.parts);
        setStatus('This is a download manifest, not conversation data. Nothing was imported.');
        return;
      }
      setAggregate(event.data.result.aggregate);
      const count = event.data.result.aggregate.days.length;
      setStatus(`Ready: ${count} aggregate ${count === 1 ? 'day' : 'days'}. Review before committing.`);
    };
    activeWorker.onerror = () => { if (worker.current !== activeWorker) return; setStatus('Could not read these files. Try a fresh export or smaller files.'); activeWorker.terminate(); };
    activeWorker.postMessage({ files, source });
  }

  function dropFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    inspect(Array.from(event.dataTransfer.files));
  }

  async function commit() {
    if (!aggregate || saving) return;
    setSaving(true);
    setStatus('Committing approved aggregates…');
    try {
      const response = await fetch('/api/v1/imports/aggregate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(aggregate) });
      const body = await response.json().catch(() => ({})) as { acceptedDays?: number; error?: string };
      setStatus(response.ok ? `Imported ${body.acceptedDays} aggregate ${body.acceptedDays === 1 ? 'day' : 'days'}. Raw content never left this browser.` : body.error ?? 'Import failed.');
      if (response.ok) {
        setAggregate(null);
        setCompleted(true);
      }
    } catch { setStatus('Could not reach the server. Your preview is still here; try again.'); }
    finally { setSaving(false); }
  }

  return <section className="import-box">
    <div className="provider-toggle" aria-label="Export provider">
      <button type="button" disabled={saving} className={source === 'chatgpt_web' ? 'active' : ''} aria-pressed={source === 'chatgpt_web'} onClick={() => selectSource('chatgpt_web')}>ChatGPT</button>
      <button type="button" disabled={saving} className={source === 'claude_web' ? 'active' : ''} aria-pressed={source === 'claude_web'} onClick={() => selectSource('claude_web')}>Claude</button>
    </div>
    <div className="export-guide">
      <div className="export-guide-head"><div><p className="eyebrow">Get the archive</p><h2>Export from {guide.name}</h2></div><a href={guide.href} target="_blank" rel="noreferrer">Official instructions ↗</a></div>
      <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
      <p>{guide.timing}</p>
    </div>
    <label className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={dropFile}>
      <strong>Choose or drop your {guide.name} export files</strong>
      <span>ZIP or JSON, up to 100 MB total. Select all conversation parts together. Files stay on this device.</span>
      <input type="file" accept=".zip,.json,application/zip,application/json" multiple disabled={saving} onChange={(event) => { inspect(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
    </label>
    <p className="status-line" aria-live="polite">{status}</p>
    {parts ? <div className="export-guide"><h2>One more step: download your conversations</h2><p>Open each download below, then select all downloaded ZIP parts together above. Download links stay in this browser and are never sent to our server.</p><ul>{parts.map((part) => <li key={part.filename}>{part.url ? <a href={part.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Download {part.filename} ↗</a> : <span>{part.filename}: download this part from your original export email.</span>}</li>)}</ul>{!parts.length ? <p>No conversation downloads were listed. Request a new export from Claude.</p> : null}</div> : null}
    {aggregate ? <div className="import-preview"><div><span>Coverage</span><strong>{aggregate.coverageStart} → {aggregate.coverageEnd}</strong></div><div><span>Sessions</span><strong>{aggregate.days.reduce((sum, day) => sum + day.sessions, 0)}</strong></div><div><span>Turns</span><strong>{aggregate.days.reduce((sum, day) => sum + day.turns, 0)}</strong></div><button type="button" className="primary-button" disabled={saving} onClick={commit}>{saving ? 'Importing…' : 'Approve aggregates'}</button></div> : null}
    <p className="status-line">Reimports update matching dates. To start fresh, remove this source’s imported data in <Link href="/connections">Connections</Link> first.</p>
    {completed && onboarding ? <div className="import-complete"><div><strong>AI activity source connected</strong><span>Your approved aggregates are ready to include in your profile.</span></div><Link className="primary-link compact-link" href="/share?onboarding=1">Preview and publish →</Link></div> : null}
  </section>;
}
