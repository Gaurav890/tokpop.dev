'use client';

import { useState, type FormEvent } from 'react';

type ConsentActionsProps = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
};

export function ConsentActions({ clientId, redirectUri, state, codeChallenge, scope }: ConsentActionsProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget);
    form.set('decision', submitter?.value ?? 'deny');
    form.set('response_mode', 'json');
    setPending(true);
    setError('');

    try {
      const response = await fetch('/oauth/authorize/decision', {
        method: 'POST',
        body: form,
        headers: { accept: 'application/json' },
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => ({})) as { redirectTo?: string; error?: string };
      if (!response.ok || !body.redirectTo) throw new Error(body.error ?? 'The connection could not be completed.');
      window.location.assign(body.redirectTo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The connection could not be completed.');
      setPending(false);
    }
  }

  return <form className="consent-actions" method="post" action="/oauth/authorize/decision" onSubmit={submit}>
    <input type="hidden" name="client_id" value={clientId}/>
    <input type="hidden" name="redirect_uri" value={redirectUri}/>
    <input type="hidden" name="state" value={state}/>
    <input type="hidden" name="code_challenge" value={codeChallenge}/>
    <input type="hidden" name="scope" value={scope}/>
    <button className="primary-button" name="decision" value="approve" disabled={pending}>{pending ? 'Connecting…' : 'Allow connection'}</button>
    <button className="text-button" name="decision" value="deny" disabled={pending}>Cancel</button>
    {error ? <p className="consent-error" role="alert">{error}</p> : null}
  </form>;
}
