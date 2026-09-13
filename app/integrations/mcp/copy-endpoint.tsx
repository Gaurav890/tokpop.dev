'use client';

import { useState } from 'react';

export function CopyEndpoint({ value }: { value: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      setStatus('error');
    }
  }

  return <button type="button" className="secondary-link compact-link" onClick={copy}>
    {status === 'copied' ? 'Endpoint copied' : status === 'error' ? 'Copy failed' : 'Copy endpoint'}
  </button>;
}
