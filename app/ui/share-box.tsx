'use client';

import { useState } from 'react';
import Image from 'next/image';
import { previewCardPath, stableCardPath } from '../../lib/card-cache';

export function ShareBox({ username, updatedAt }: { username: string; updatedAt: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState('');
  const card = stableCardPath(username, theme);
  const previewCard = previewCardPath(username, theme, updatedAt);
  const profile = `/u/${username}`;
  const markdown = `[![AI Native Profile](${card})](${profile})`;
  async function copy(value: string, label: string) { const absolute = value.replaceAll('](/', `](${window.location.origin}/`).replaceAll('src="/', `src="${window.location.origin}/`).replaceAll('href="/', `href="${window.location.origin}/`); await navigator.clipboard.writeText(absolute); setCopied(label); window.setTimeout(() => setCopied(''), 1600); }
  return <section className="share-box" id="share">
    <div><p className="eyebrow">README card</p><h2>Make your workflow portable.</h2><p>Dynamic SVG, GitHub-safe, and always linked to current coverage.</p></div>
    <div className="share-controls"><div className="provider-toggle"><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button></div><div className="copy-actions"><button className="primary-button" onClick={() => copy(markdown, 'markdown')}>{copied === 'markdown' ? 'Copied' : 'Copy Markdown'}</button><button className="secondary-button" onClick={() => copy(`<a href="${profile}"><img src="${card}" alt="AI Native Profile" /></a>`, 'html')}>{copied === 'html' ? 'Copied' : 'Copy HTML'}</button></div></div>
    <Image className="readme-card" src={previewCard} width={640} height={210} unoptimized alt={`${username}'s AI Native Profile card`}/>
    <code className="embed-code">{markdown || `![AI Native Profile](/api/v1/cards/${username})`}</code>
    <div className="asset-links"><a href={`${card}&format=badge&v=${encodeURIComponent(updatedAt)}`}>Badge</a><a href={`${card}&format=og&v=${encodeURIComponent(updatedAt)}`}>Open Graph</a><a href={`${card}&format=square&v=${encodeURIComponent(updatedAt)}`}>Square</a><a href={`${card}&format=story&v=${encodeURIComponent(updatedAt)}`}>Story</a></div>
  </section>;
}
