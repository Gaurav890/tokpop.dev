'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { revealStorageKey } from '../../lib/setup-progress';

export function ShareStage({ ready, accountLogin, children }: { ready: boolean; accountLogin: string; children: ReactNode }) {
  const reveal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    try {
      const key = revealStorageKey(accountLogin);
      const timestamp = Number(sessionStorage.getItem(key));
      sessionStorage.removeItem(key);
      if (timestamp && Date.now() - timestamp < 60000) reveal.current?.focus();
    } catch { /* The card is usable without browser storage. */ }
  }, [ready, accountLogin]);
  if (ready) return <div className="card-reveal" ref={reveal} tabIndex={-1} role="region" aria-label="Your activity arrived. Your card is ready to share.">{children}</div>;
  return <section className="starter-card-option">
    <div className="locked-card-teaser"><span aria-hidden="true">✦</span><div><strong>Your build identity is waiting.</strong><p>Connect your tools above to reveal your real tokens, streak, and card.</p></div><small>PRIVATE</small></div>
    <details><summary>Use a GitHub-only starter card instead</summary>{children}</details>
  </section>;
}
