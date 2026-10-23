'use client';

import { useState } from 'react';
import Link from '../ui/native-link';

export function ConnectForm({ initialCode = '' }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [approved, setApproved] = useState(false);
  async function approve(event: React.FormEvent) {
    event.preventDefault(); setStatus('Approving device…');
    setPending(true);
    try {
    const response = await fetch('/api/v1/device/approve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userCode: code }) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    setApproved(response.ok);
    setStatus(response.ok ? 'You’re paired! Return to Terminal to review and approve your first sync.' : body.error ?? 'Approval failed.');
    } catch { setStatus('Could not reach the server. Check your connection and try again.'); }
    finally { setPending(false); }
  }
  return <form className="connect-form" onSubmit={approve}><label htmlFor="pair-code">Pairing code</label><div><input id="pair-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="AB12CD34" maxLength={12} autoComplete="off" spellCheck={false} required autoFocus disabled={pending || approved}/><button type="submit" className="primary-button" disabled={pending || approved}>{approved ? 'Paired ✓' : pending ? 'Approving…' : 'Approve device'}</button></div>{status ? <p className="status-line" aria-live="polite">{status}</p> : null}{approved ? <Link className="primary-link" href="/share">After syncing, see my card →</Link> : null}</form>;
}
