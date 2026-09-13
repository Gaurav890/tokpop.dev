'use client';

import { useState } from 'react';

export function ConnectForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState('');
  async function approve(event: React.FormEvent) {
    event.preventDefault(); setStatus('Approving device…');
    const response = await fetch('/api/v1/device/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userCode: code }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setStatus(response.ok ? 'Device approved. Return to the terminal; synchronization can now begin.' : body.error ?? 'Approval failed.');
  }
  return <form className="connect-form" onSubmit={approve}><label htmlFor="pair-code">Pairing code</label><div><input id="pair-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={12} autoComplete="off" spellCheck={false} required autoFocus/><button type="submit" className="primary-button">Approve device</button></div>{status ? <p className="status-line" aria-live="polite">{status}</p> : null}</form>;
}
