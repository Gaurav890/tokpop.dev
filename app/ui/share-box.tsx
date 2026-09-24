'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cardFunnelPath, previewCardPath, stableCardPath } from '../../lib/card-cache';

export function ShareBox({ username, updatedAt }: { username: string; updatedAt: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState('');
  const card = stableCardPath(username, theme);
  const previewCard = previewCardPath(username, theme, updatedAt);
  const funnel = cardFunnelPath(username);
  const markdown = `[![AI Native Profile](${card})](${funnel})`;
  async function copy(value: string, label: string) { const absolute = value.replaceAll('](/', `](${window.location.origin}/`).replaceAll('src="/', `src="${window.location.origin}/`).replaceAll('href="/', `href="${window.location.origin}/`); await navigator.clipboard.writeText(absolute); setCopied(label); window.setTimeout(() => setCopied(''), 1600); }
  return <section className="share-box" id="share">
    <div><p className="eyebrow">Your build drop</p><h2>This belongs in your README.</h2><p>Pick a flavor, copy it, and flex responsibly. Your stats level up automatically.</p></div>
    <div className="share-controls"><div className="provider-toggle" aria-label="Card color"><button type="button" aria-pressed={theme === 'dark'} className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Hyper</button><button type="button" aria-pressed={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Fresh</button></div><div className="copy-actions"><button type="button" className="primary-button" onClick={() => copy(markdown, 'markdown')}>{copied === 'markdown' ? 'Copied ✓' : 'Copy my card'}</button></div></div>
    <Image className="readme-card" src={previewCard} width={640} height={252} unoptimized alt={`${username}'s AI build card`}/>
    <p className="share-box-hint">Paste it into your GitHub profile README. The card stays live; clicking it opens a make-your-own flow inspired by you.</p>
    <details className="asset-drawer"><summary>Other formats</summary><div className="asset-links"><button type="button" onClick={() => copy(`<a href="${funnel}"><img src="${card}" alt="${username}'s AI build card — click to make yours" /></a>`, 'html')}>{copied === 'html' ? 'HTML copied ✓' : 'Copy HTML'}</button><a href={`${card}&format=badge&v=${encodeURIComponent(updatedAt)}`}>Tiny badge</a><a href={`${card}&format=og&v=${encodeURIComponent(updatedAt)}`}>Social card</a><a href={`${card}&format=square&v=${encodeURIComponent(updatedAt)}`}>Square</a><a href={`${card}&format=story&v=${encodeURIComponent(updatedAt)}`}>Story</a></div></details>
  </section>;
}
