'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '../ui/native-link';
import { collectorConnectCommand, CONNECTOR_VERSION } from '../../lib/collector-command';
import { readSetupAttempt, revealStorageKey, setupStorageKey, type SetupProgress } from '../../lib/setup-progress';

type Pairing = { deviceId: string; userCode: string; expiresAt: string; apiOrigin: string };
const sourceNames: Record<string, string> = { codex:'Codex', claude_code:'Claude Code', cursor:'Cursor', gemini_cli:'Gemini CLI', copilot_cli:'Copilot CLI' };

export function PowerUpPanel({ hasCodingEvidence, publicOrigin, accountLogin }: { hasCodingEvidence: boolean; publicOrigin?: string; accountLogin?: string }) {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [message, setMessage] = useState('');
  const storageKey = setupStorageKey(accountLogin ?? '');
  const synced = progress?.stage === 'imported' || (hasCodingEvidence && !attemptId);
  const expired = progress?.stage === 'expired' || progress?.stage === 'revoked';
  const claimed = progress && ['paired','empty','limited','unknown','imported'].includes(progress.stage);
  const command = pairing && !claimed && !expired ? collectorConnectCommand(pairing.userCode, pairing.apiOrigin) : '';
  const syncCommand = `npm exec --yes --package=ai-native-profile@${CONNECTOR_VERSION} -- ai-native-profile sync`;

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let id: string | null = null;
      try { id = readSetupAttempt(sessionStorage.getItem(storageKey)); } catch { /* Setup works when browser storage is disabled. */ }
      if (!cancelled) { setAttemptId(id); setRestoring(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    let timer: number | undefined;
    const check = async () => {
      let keepChecking = true;
      try {
        const response = await fetch(`/api/v1/device/setup?deviceId=${encodeURIComponent(attemptId)}`, { cache:'no-store' });
        const body = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (response.status === 401) {
          setNeedsSignIn(true); setMessage('Sign in again to resume. Your computer does not need to be paired again.'); keepChecking = false;
        } else if (response.status === 404) {
          setAttemptId(null); setPairing(null); setProgress(null);
          try { sessionStorage.removeItem(storageKey); } catch { /* No persistent state to clear. */ }
          setMessage('That setup is no longer available for this account. Start a new setup.'); keepChecking = false;
        } else {
          if (!response.ok || !body.stage) throw new Error('Status unavailable');
          setProgress(body as SetupProgress);
          if (body.stage === 'imported') {
            try { sessionStorage.removeItem(storageKey); sessionStorage.setItem(revealStorageKey(accountLogin ?? ''), String(Date.now())); } catch { /* No persistent state to clear. */ }
            keepChecking = false;
            router.refresh();
          } else if (['expired','revoked'].includes(body.stage)) keepChecking = false;
        }
      } catch {
        if (!cancelled) setMessage('We cannot check progress right now. Continue in Terminal; this page will retry automatically.');
      } finally {
        if (!cancelled && keepChecking) timer = window.setTimeout(() => void check(), 2500);
      }
    };
    void check();
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [attemptId, router, storageKey, accountLogin]);

  async function copy(value: string, success: string) {
    try { await navigator.clipboard.writeText(value); setMessage(success); }
    catch { setMessage('Clipboard unavailable. Select and copy the full command below.'); }
  }

  async function createCommand() {
    setCreating(true); setMessage('Creating your personal setup command…');
    try {
      const response = await fetch('/api/v1/device/pair', { method:'POST', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ flow:'onboarding', collectorVersion:CONNECTOR_VERSION }) });
      const body = await response.json().catch(() => ({})) as Pairing & { error?: string };
      if (response.status === 401) setNeedsSignIn(true);
      if (!response.ok) throw new Error(body.error ?? 'Could not create a setup command. Please try again.');
      if (!readSetupAttempt(body.deviceId) || !body.userCode || !Number.isFinite(Date.parse(body.expiresAt))) throw new Error('Invalid setup response. Please try again.');
      const next = { ...body, apiOrigin:publicOrigin ?? window.location.origin };
      const nextCommand = collectorConnectCommand(next.userCode, next.apiOrigin);
      setProgress(null); setPairing(next); setAttemptId(next.deviceId);
      try { sessionStorage.setItem(storageKey, next.deviceId); } catch { /* The command and pairing secret stay in memory only. */ }
      await copy(nextCommand, 'Copied! Open Terminal on your coding computer, paste, and press Enter.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not start setup. Please try again.'); }
    finally { setCreating(false); }
  }

  return <section className={`power-up-panel guided-setup ${synced ? 'complete' : ''}`} id="power-up" aria-label="Connect your coding tools">
    <div className="power-up-copy">
      <p className="eyebrow">{synced ? 'Stats landed ✨' : 'Connect · one command for all your tools'}</p>
      <h2>{synced ? 'Your first sync landed.' : claimed ? 'You’re paired. Finish in Terminal.' : 'Let’s reveal your build identity.'}</h2>
      <p>{synced ? 'Your coding activity is ready. Your card is the next stop.' : 'No provider-by-provider setup. Run one command on the computer where you use your coding tools.'}</p>
      {!synced ? <>
        <div className="source-loadout" aria-label="Supported local coding tools"><span>Codex</span><span>Claude Code</span><span>Cursor</span><span>Gemini CLI</span><span>Copilot CLI</span></div>
        <p className="setup-account">Connecting to <strong>@{accountLogin}</strong>. Use your own account. Keep this command private.</p>
      </> : null}
    </div>
    <div className="power-up-action">
      {needsSignIn ? <Link className="power-button" href="/api/auth/github/start?return_to=%2Fshare%3Fconnect%3D1">Sign in &amp; resume →</Link>
        : synced ? <><div className="power-up-success"><span>✓</span><strong>{progress?.receipt?.sources.map((source) => sourceNames[source] ?? source).join(' + ') || 'Coding activity imported'}</strong></div><p>Finish the automatic-updates choice in Terminal. A successful upload alone does not confirm background updates are enabled.</p><Link className="power-button" href="/share">View my card →</Link></>
        : <>
          {(!attemptId || expired || (!pairing && progress?.stage === 'waiting')) ? <button type="button" className="power-button" onClick={createCommand} disabled={creating || restoring}>{restoring ? 'Checking setup…' : creating ? 'Creating…' : expired ? 'Copy a fresh setup command' : 'Copy setup command'} <span>→</span></button> : null}
          {command ? <><pre className="setup-command" aria-label="Setup command"><code>{command}</code></pre><button type="button" className="power-button" onClick={() => copy(command, 'Copied! Paste into Terminal and press Enter.')}>Copy command again</button><small>Single use · expires {new Date(pairing!.expiresAt).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</small></> : null}
          <div className="setup-live-state" role="status">
            {expired ? 'This setup command expired or was revoked. Copy a fresh one when you are ready.'
              : progress?.stage === 'empty' ? 'Upload received, but no usable coding activity was found. You are paired—do not reconnect.'
              : progress?.stage === 'limited' ? 'Activity received. These records do not yet contain the recent stats needed for your full card. You are paired—do not reconnect. You can use the starter card below while you check your sources.'
              : progress?.stage === 'unknown' ? 'An upload was received, but its activity details are unavailable. Check your card or retry a sync.'
              : claimed ? 'Computer paired. Review and approve the aggregate upload in Terminal. We’re watching for your activity here.'
              : attemptId ? 'Waiting for Terminal. Keep this page open; your card will appear after activity arrives.' : 'Your card stays private until you choose to publish.'}
          </div>
          {claimed ? <details className="setup-help" open={progress?.stage === 'empty'}><summary>{progress?.stage === 'empty' ? 'How to find your missing activity' : 'Finished in Terminal, but still waiting?'}</summary><p>Use a supported coding tool on this computer and operating-system account, then retry the upload. Claude web chats are separate from Claude Code history.</p><pre className="setup-command"><code>{syncCommand}</code></pre><button type="button" className="secondary-link" onClick={() => copy(syncCommand, 'Retry command copied. Run it in Terminal; this page will update when activity arrives.')}>Copy retry command</button></details> : null}
        </>}
      {message ? <p className="power-up-status" aria-live="polite">{message}</p> : null}
      <details className="setup-help"><summary>Need help or want to inspect first?</summary>
        <p><strong>Missing Node.js?</strong> Install a supported version from <a href="https://nodejs.org/en/download" target="_blank" rel="noreferrer">nodejs.org</a>, reopen Terminal, and run setup again.</p>
        <p>Check tools without uploading: <code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile sources</code></p>
        <p>Check automatic updates: <code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile doctor</code></p>
        <p>Updates run every 15 minutes only when enabled and your computer is awake and online. You can still share without them.</p>
        <Link href="/settings/devices">Manage paired computers →</Link>
      </details>
    </div>
    {!synced ? <ol className="setup-steps">
      <li><strong>{claimed ? 'Computer paired ✓' : 'Copy your setup command'}</strong><span>One command checks all supported tools.</span></li>
      <li><strong>Paste into Terminal and press Enter</strong><span>No project folder needed. Use your coding computer, not your phone. Requires Node.js 22.13 or newer.</span></li>
      <li><strong>Review the upload, then choose updates</strong><span>Automatic updates are optional. Finish both Terminal questions, then return here.</span></li>
    </ol> : null}
    <p className="power-up-boundary"><strong>Only aggregate stats leave your computer.</strong> Never uploaded: prompts, responses, source code, commands, file paths, repositories, or credentials.</p>
  </section>;
}
