'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestGitHubProof, type GitHubSyncResult } from '../../lib/github-sync-result';

function resultDetail(result: GitHubSyncResult) {
  return `${result.commits} commit contributions · ${result.pullRequests} pull requests · ${result.reviews} reviews across ${result.windowDays} days.`;
}

export function GitHubProofSync({ quiet = false }: { quiet?: boolean }) {
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

  if (quiet && state === 'ready') return null;
  return <div className={`github-sync-status ${state}`}>
    <p role="status">{state === 'syncing' ? 'Refreshing GitHub receipts in the background…' : detail}</p>
    {state === 'error' ? <button type="button" onClick={retry}>Retry GitHub refresh</button> : null}
  </div>;
}
