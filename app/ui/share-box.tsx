'use client';

import { useState } from 'react';

export function ShareBox({ username }: { username: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copied, setCopied] = useState('');
  const card = `/api/v1/cards/${username}?theme=${theme}`;
  const markdown = `![AI Native Profile](${card})`;
  async function copy(value: string, label: string) { const absolute = value.replaceAll('](/', `](${window.location.origin}/`).replaceAll('src="/', `src="${window.location.origin}/`); await navigator.clipboard.writeText(absolute); setCopied(label); window.setTimeout(() => setCopied(''), 1600); }
  return <section className="share-box" id="share">
    <div><p className="eyebrow">README card</p><h2>Make your workflow portable.</h2><p>Dynamic SVG, GitHub-safe, and always linked to current coverage.</p></div>
    <div className="share-controls"><div className="provider-toggle"><button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>Dark</button><button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>Light</button></div><div className="copy-actions"><button className="primary-button" onClick={() => copy(markdown, 'markdown')}>{copied === 'markdown' ? 'Copied' : 'Copy Markdown'}</button><button className="secondary-button" onClick={() => copy(`<img src="${card}" alt="AI Native Profile" />`, 'html')}>{copied === 'html' ? 'Copied' : 'Copy HTML'}</button></div></div>
    <img className="readme-card" src={`/api/v1/cards/${username}?theme=${theme}`} alt={`${username}'s AI Native Profile card`}/>
    <code className="embed-code">{markdown || `![AI Native Profile](/api/v1/cards/${username})`}</code>
    <div className="asset-links"><a href={`/api/v1/cards/${username}?theme=${theme}&format=badge`}>Badge</a><a href={`/api/v1/cards/${username}?theme=${theme}&format=og`}>Open Graph</a><a href={`/api/v1/cards/${username}?theme=${theme}&format=square`}>Square</a><a href={`/api/v1/cards/${username}?theme=${theme}&format=story`}>Story</a></div>
  </section>;
}
