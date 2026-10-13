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

export function PowerUpPanel({ hasCodingEvidence, publicOrigin }: { hasCodingEvidence: boolean; publicOrigin?: string }) {
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
      const response = await fetch('/api/v1/devices', { cache: 'no-store' });
      const body = await response.json().catch(() => ({})) as { devices?: Device[] };
      if (cancelled || !response.ok) return;
      const device = body.devices?.find((item) => item.id === pairing.deviceId);
      if (device?.lastSeenAt) {
        setState('synced');
        setMessage('Activity connected. Approve automatic updates in Terminal to keep it fresh.');
        router.refresh();
      }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pairing, router, state]);

  async function createCommand() {
    setState('creating');
    setMessage('Creating your one-time command…');
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
    const nextPairing = { deviceId: body.deviceId, userCode: body.userCode, expiresAt: body.expiresAt, apiOrigin: publicOrigin ?? window.location.origin };
    const nextCommand = collectorConnectCommand(nextPairing.userCode, nextPairing.apiOrigin);
    setPairing(nextPairing);
    setState('waiting');
    try {
      await navigator.clipboard.writeText(nextCommand);
      setMessage('Command copied. Paste it into Terminal, approve the first sync, then turn on automatic updates.');
    } catch {
      setMessage('Copy the command below into Terminal, approve the first sync, then turn on automatic updates.');
    }
  }

  async function copyCommand() {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setMessage('Command copied. Paste it into Terminal.');
  }

  return <section className={`power-up-panel ${state === 'synced' ? 'complete' : ''}`} id="power-up">
    <div className="power-up-copy">
      <p className="eyebrow">{state === 'synced' ? 'Connected ⚡' : 'One command · one time'}</p>
      <h2>{state === 'synced' ? 'Your coding activity is connected.' : 'Connect my AI tools.'}</h2>
      <p>One command finds Codex, Claude Code, Cursor, Gemini CLI, and Copilot CLI together. It previews the privacy boundary, sends the first aggregate sync, then asks whether to refresh every 15 minutes.</p>
      <div className="source-loadout" aria-label="Supported local coding tools">
        <span>Codex</span><span>Claude Code</span><span>Cursor</span><span>Gemini CLI</span><span>Copilot CLI</span>
      </div>
    </div>
    <div className="power-up-action">
      {!pairing && state !== 'synced' ? <button type="button" className="power-button" onClick={createCommand} disabled={state === 'creating'}>{state === 'creating' ? 'Creating…' : state === 'error' ? 'Generate a fresh command' : 'Connect my AI tools'} <span>↗</span></button> : null}
      {pairing && state !== 'synced' ? <>
        <button type="button" className="command-copy" onClick={copyCommand}><code>{command}</code><span>Copy</span></button>
        <small>Single use · expires {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
      </> : null}
      {state === 'synced' ? <div className="power-up-success"><span>✓</span><strong>Coding stats connected</strong></div> : null}
      {message ? <p className={`power-up-status ${state}`} aria-live="polite">{message}</p> : null}
      {state === 'synced' ? <div className="more-source-links"><Link href="/connections">Manage data sources</Link></div> : null}
    </div>
    <p className="power-up-boundary"><strong>Never uploaded:</strong> prompts, responses, source code, commands, file paths, repositories, or credentials.</p>
  </section>;
}
