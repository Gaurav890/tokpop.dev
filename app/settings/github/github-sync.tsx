'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GitHubSync() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    setStatus('Reading your GitHub contribution graph…');
    try {
      const response = await fetch('/api/v1/github/sync', { method: 'POST', signal: AbortSignal.timeout(25000) });
      const body = await response.json() as { commits?: number; pullRequests?: number; reviews?: number; coverageStart?: string; coverageEnd?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? 'Sync failed.');
      setStatus(`Synced ${body.commits} commit contributions, ${body.pullRequests} opened pull requests, and ${body.reviews} reviews. Window: ${body.coverageStart} → ${body.coverageEnd} (UTC).`);
      router.refresh();
    } catch {
      setStatus('Could not refresh receipts. Previous data is preserved. Check your connection or reconnect GitHub, then retry.');
    } finally {
      setBusy(false);
    }
  }
  return <section className="settings-card"><p className="eyebrow">GitHub contribution evidence</p><h2>Refresh GitHub</h2><p>Read GitHub-defined totals for the past 90 calendar days. Private coverage depends on your visibility settings and permissions; repository names are never collected.</p><button type="button" className="primary-button" disabled={busy} onClick={sync}>{busy ? 'Refreshing…' : 'Refresh now'}</button><p className="status-line" role="status">{status}</p></section>;
}
