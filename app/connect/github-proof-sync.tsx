'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type SyncResult = {
  windowDays?: number;
  commits?: number;
  pullRequests?: number;
  reviews?: number;
  privateContributions?: number;
  activeDays?: number;
  error?: string;
};

async function requestGitHubProof(): Promise<SyncResult> {
  const response = await fetch('/api/v1/github/sync', { method: 'POST', signal: AbortSignal.timeout(25000) });
  const body = await response.json().catch(() => ({})) as SyncResult;
  if (!response.ok) throw new Error(body.error ?? 'GitHub activity sync failed.');
  return body;
}

function resultDetail(result: SyncResult) {
  return `${result.commits ?? 0} commits · ${result.pullRequests ?? 0} pull requests · ${result.reviews ?? 0} reviews across ${result.windowDays ?? 90} days.`;
}

export function GitHubProofSync({ username, compact = false }: { username: string; compact?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<'syncing' | 'ready' | 'error'>('syncing');
  const [detail, setDetail] = useState('Reading your GitHub contribution graph…');

  useEffect(() => {
    let cancelled = false;
    requestGitHubProof().then((result) => {
      if (cancelled) return;
      setState('ready');
      setDetail(resultDetail(result));
      router.refresh();
    }).catch((error: unknown) => {
      if (cancelled) return;
      setState('error');
      setDetail(error instanceof Error ? error.message : 'GitHub activity sync failed.');
    });
    return () => { cancelled = true; };
  }, [router]);

  async function retry() {
    setState('syncing');
    setDetail('Reading your GitHub contribution graph…');
    try {
      const body = await requestGitHubProof();
      setState('ready');
      setDetail(resultDetail(body));
      router.refresh();
    } catch (error) {
      setState('error');
      setDetail(error instanceof Error ? error.message : 'GitHub activity sync failed.');
    }
  }

  return <section className={`github-proof-sync ${state} ${compact ? 'compact' : ''}`}>
    <div className="github-proof-icon">GH</div>
    <div><p className="eyebrow">GitHub connected · @{username}</p><h2>{state === 'ready' ? 'Starter stats loaded.' : state === 'error' ? 'GitHub needs another try.' : 'Loading your starter stats.'}</h2><p aria-live="polite">{detail}</p></div>
    {state === 'error' ? <button type="button" className="secondary-link compact-link" onClick={retry}>Retry sync</button> : <span className="onboarding-source-state">{state === 'ready' ? 'Connected' : 'Syncing'}</span>}
  </section>;
}
