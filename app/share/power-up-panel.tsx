'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '../ui/native-link';
import { collectorConnectCommand, CONNECTOR_VERSION } from '../../lib/collector-command';

type Pairing = {
  deviceId: string;
  userCode: string;
  expiresAt: string;
  apiOrigin: string;
};

type Device = {
  id: string;
  lastSeenAt: string | null;
};

export function PowerUpPanel({ hasCodingEvidence, publicOrigin, accountLogin }: { hasCodingEvidence: boolean; publicOrigin?: string; accountLogin?: string }) {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [state, setState] = useState<'idle' | 'creating' | 'waiting' | 'synced' | 'error'>(hasCodingEvidence ? 'synced' : 'idle');
  const [message, setMessage] = useState(hasCodingEvidence ? 'Coding activity is connected.' : '');
  const command = pairing ? collectorConnectCommand(pairing.userCode, pairing.apiOrigin) : '';

  useEffect(() => {
    if (!pairing || state !== 'waiting') return;
    let cancelled = false;
    const check = async () => {
      if (Date.parse(pairing.expiresAt) <= Date.now()) {
        setPairing(null);
        setState('error');
        setMessage('That command expired. Generate a fresh one when you are ready.');
        return;
      }
      try {
        const response = await fetch('/api/v1/devices', { cache: 'no-store' });
        const body = await response.json().catch(() => ({})) as { devices?: Device[] };
        if (cancelled) return;
        if (response.status === 401) {
          setState('error');
          setPairing(null);
          setMessage('Your sign-in expired. Reload this page and sign in again to continue.');
          return;
        }
        if (!response.ok) throw new Error('Status unavailable');
        const device = body.devices?.find((item) => item.id === pairing.deviceId);
        if (device?.lastSeenAt) {
          setState('synced');
          setMessage('First sync received. Check connected tools below; a successful sync does not mean every tool has history. Approve automatic updates in Terminal if you want them.');
          router.refresh();
        }
      } catch {
        if (!cancelled) setMessage('Cannot check sync status right now. Keep this page open; we will retry. You can continue in Terminal.');
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pairing, router, state]);

  async function createCommand() {
    setState('creating');
    setMessage('Creating your one-time command…');
    try {
      const response = await fetch('/api/v1/device/pair', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ flow: 'onboarding', collectorVersion: CONNECTOR_VERSION }),
      });
      const body = await response.json().catch(() => ({})) as Pairing & { error?: string };
      if (!response.ok) {
        setState('error');
        setMessage(body.error ?? 'The connection command could not be created.');
        return;
      }
      if (!body.deviceId || !body.userCode || !Number.isFinite(Date.parse(body.expiresAt))) throw new Error('Invalid pairing response');
      const nextPairing = { deviceId: body.deviceId, userCode: body.userCode, expiresAt: body.expiresAt, apiOrigin: publicOrigin ?? window.location.origin };
      const nextCommand = collectorConnectCommand(nextPairing.userCode, nextPairing.apiOrigin);
      setPairing(nextPairing);
      setState('waiting');
      try {
        await navigator.clipboard.writeText(nextCommand);
        setMessage('Command copied. Paste it into Terminal, approve the first sync, then choose whether to enable automatic updates.');
      } catch {
        setMessage('Select and copy the command shown here into Terminal, approve the first sync, then choose whether to enable automatic updates.');
      }
    } catch {
      setState('error');
      setMessage('Could not create a setup command. Check your connection and try again.');
    }
  }

  async function copyCommand() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setMessage('Command copied. Paste it into Terminal.');
    } catch {
      setMessage('Clipboard access is unavailable. Select and copy the full command shown below.');
    }
  }

  return <section className={`power-up-panel ${state === 'synced' ? 'complete' : ''}`} id="power-up">
    <div className="power-up-copy">
      <p className="eyebrow">{state === 'synced' ? 'Connected ⚡' : 'One command · one time'}</p>
      <h2>{state === 'synced' ? 'Your first sync landed.' : 'Connect my AI tools.'}</h2>
      <p>{state === 'synced' ? 'Your build story is taking shape. See your card, pick a flavor, and give your README some personality.' : 'One command checks all your supported tools. Review what gets shared, approve the first sync, and choose automatic updates. No provider-by-provider setup.'}</p>
      <div className="source-loadout" aria-label="Supported local coding tools">
        <span>Codex</span><span>Claude Code</span><span>Cursor</span><span>Gemini CLI</span><span>Copilot CLI</span>
      </div>
      {accountLogin && state !== 'synced' ? <p className="setup-account">Connecting to <strong>@{accountLogin}</strong>. Not your account? Switch accounts before running this command. Keep it private.</p> : null}
      {state !== 'synced' ? <ol className="setup-steps">
        <li><strong>Copy your setup command</strong><span>One command checks all supported tools. You do not need to pick a provider.</span></li>
        <li><strong>Run it on your coding computer</strong><span>Open Terminal, paste, and press Enter. No project folder needed. Requires Node.js 22.13 or newer and local tool history.</span></li>
        <li><strong>Review, sync, then share</strong><span>Approve the aggregate upload in Terminal. Automatic updates are optional and run every 15 minutes while the computer is awake and online.</span></li>
      </ol> : null}
    </div>
    <div className="power-up-action">
      {!pairing && state !== 'synced' ? <button type="button" className="power-button" onClick={createCommand} disabled={state === 'creating'}>{state === 'creating' ? 'Creating…' : state === 'error' ? 'Generate a fresh command' : 'Connect my AI tools'} <span>↗</span></button> : null}
      {pairing && state !== 'synced' ? <>
        <pre className="setup-command" aria-label="Setup command"><code>{command}</code></pre>
        <button type="button" className="power-button" onClick={copyCommand}>Copy command</button>
        <small>Single use · expires {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
      </> : null}
      {state === 'synced' ? <div className="power-up-success"><span>✓</span><strong>First sync received</strong></div> : null}
      {message ? <p className={`power-up-status ${state}`} aria-live="polite">{message}</p> : null}
      {state === 'synced' ? <div className="setup-next"><Link className="primary-link" href="/share">View my card →</Link><Link href="/connections">Check connected tools →</Link><Link href="/connect">Connect another computer →</Link></div> : null}
      <details className="setup-help"><summary>Missing a tool or stuck?</summary>
        <p>Run setup on the computer and operating-system account where you use the tool. Claude Code history is separate from Claude web chats. Codex needs supported local history or available account totals; installing a tool alone does not create activity.</p>
        <p>Check what this computer can find (no upload):</p><code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile sources</code>
        <p>Already paired? Check sync health:</p><code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile doctor</code>
        <p>After using the missing tool, retry the upload:</p><code>npm exec --yes --package=ai-native-profile@{CONNECTOR_VERSION} -- ai-native-profile sync</code>
        <Link href="/settings/devices">Manage paired computers →</Link>
      </details>
    </div>
    <p className="power-up-boundary"><strong>Never uploaded:</strong> prompts, responses, source code, commands, file paths, repositories, or credentials.</p>
  </section>;
}
