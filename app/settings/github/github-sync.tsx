'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestGitHubProof } from '../../../lib/github-sync-result';

export function GitHubSync() {
  const router = useRouter();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    setStatus('Reading your GitHub contribution graph…');
    try {
      const body = await requestGitHubProof();
      setStatus(`Synced ${body.commits} commit contributions, ${body.pullRequests} opened pull requests, and ${body.reviews} reviews. Window: ${body.coverageStart} → ${body.coverageEnd} (UTC).`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not refresh receipts. Your saved data is unchanged.');
    } finally {
      setBusy(false);
    }
  }
  return <section className="settings-card"><p className="eyebrow">GitHub contribution evidence</p><h2>Refresh GitHub</h2><p>Read GitHub-defined totals for the past 90 calendar days. Private coverage depends on your visibility settings and permissions; repository names are never collected.</p><button type="button" className="primary-button" disabled={busy} onClick={sync}>{busy ? 'Refreshing…' : 'Refresh now'}</button><p className="status-line" role="status">{status}</p></section>;
}
