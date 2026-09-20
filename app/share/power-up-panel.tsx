'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from '../ui/native-link';

type Pairing = {
  deviceId: string;
  userCode: string;
  expiresAt: string;
};

type Device = {
  id: string;
  lastSeenAt: string | null;
};

const CONNECTOR_VERSION = '0.2.0';

export function PowerUpPanel({ hasCodingEvidence }: { hasCodingEvidence: boolean }) {
  const router = useRouter();
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [state, setState] = useState<'idle' | 'creating' | 'waiting' | 'synced' | 'error'>(hasCodingEvidence ? 'synced' : 'idle');
  const [message, setMessage] = useState(hasCodingEvidence ? 'Coding activity is connected.' : '');
  const command = pairing ? `npx --yes ai-native-profile@${CONNECTOR_VERSION} connect --code ${pairing.userCode}` : '';

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
        setMessage('Activity connected. Your card has been powered up.');
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
    const nextPairing = { deviceId: body.deviceId, userCode: body.userCode, expiresAt: body.expiresAt };
    const nextCommand = `npx --yes ai-native-profile@${CONNECTOR_VERSION} connect --code ${nextPairing.userCode}`;
    setPairing(nextPairing);
    setState('waiting');
    try {
      await navigator.clipboard.writeText(nextCommand);
      setMessage('Command copied. Paste it into Terminal—the card will refresh after the first sync.');
    } catch {
      setMessage('Copy the command below into Terminal. The card will refresh after the first sync.');
    }
  }

  async function copyCommand() {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setMessage('Command copied. Paste it into Terminal.');
  }

  return <section className={`power-up-panel ${state === 'synced' ? 'complete' : ''}`} id="power-up">
    <div className="power-up-copy">
      <p className="eyebrow">{state === 'synced' ? 'Powered up ⚡' : 'Optional · stronger live stats'}</p>
      <h2>{state === 'synced' ? 'Your coding activity is connected.' : 'Power up with coding activity.'}</h2>
      <p>One command finds Codex, Claude Code, Cursor, Gemini CLI, and Copilot CLI together. You review the aggregate fields before the first sync.</p>
      <div className="source-loadout" aria-label="Supported local coding tools">
        <span>Codex</span><span>Claude Code</span><span>Cursor</span><span>Gemini CLI</span><span>Copilot CLI</span>
      </div>
    </div>
    <div className="power-up-action">
      {!pairing && state !== 'synced' ? <button type="button" className="power-button" onClick={createCommand} disabled={state === 'creating'}>{state === 'creating' ? 'Creating…' : state === 'error' ? 'Generate a fresh command' : 'Copy one command'} <span>↗</span></button> : null}
      {pairing && state !== 'synced' ? <>
        <button type="button" className="command-copy" onClick={copyCommand}><code>{command}</code><span>Copy</span></button>
        <small>Single use · expires {new Date(pairing.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
      </> : null}
      {state === 'synced' ? <div className="power-up-success"><span>✓</span><strong>Live stats connected</strong></div> : null}
      {message ? <p className={`power-up-status ${state}`} aria-live="polite">{message}</p> : null}
      <div className="more-source-links"><Link href="/import">Import chat history</Link><Link href="/integrations/mcp">Assistant actions</Link><Link href="/connections">All sources</Link></div>
    </div>
    <p className="power-up-boundary"><strong>Never uploaded:</strong> prompts, responses, source code, commands, file paths, repositories, or credentials.</p>
  </section>;
}
