'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RemoveImport({ source, name }: { source: 'chatgpt_web' | 'claude_web'; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState('');
  async function remove() {
    if (pending) return;
    setPending(true);
    setStatus('Removing imported data…');
    try {
      const response = await fetch('/api/v1/imports/aggregate', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ source, confirm: true }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Removal failed. Please retry.');
      setStatus(`${name} imports removed. You can import a fresh export whenever you like.`);
      setConfirming(false);
      router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Could not reach the server. Please retry.'); }
    finally { setPending(false); }
  }
  return <div className="remove-import">
    {!confirming ? <button type="button" className="text-link" onClick={() => { setConfirming(true); setStatus(''); }}>Remove imported data</button> : <div className="remove-import-confirm">
      <strong>Remove {name} imports?</strong>
      <p>This removes this source’s imported counts and its export snapshots from your connected GitHub storage branch. Coding stats and MCP observations stay. Git commit history, other branches, and downloaded copies are not erased.</p>
      <div><button type="button" className="danger-button" disabled={pending} onClick={remove}>{pending ? 'Removing…' : 'Yes, remove imports'}</button><button type="button" className="secondary-button" disabled={pending} onClick={() => { setConfirming(false); setStatus(''); }}>Cancel</button></div>
    </div>}
    <p role="status">{status}</p>
  </div>;
}
