'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '../ui/native-link';
import { cardFunnelPath } from '../../lib/card-cache';
import type { ReadmeDestination } from '../../lib/readme-destination';

type Settings = {
  publicEnabled: boolean;
  leaderboardEnabled: boolean;
  comparisonEnabled: boolean;
  conversationEnabled: boolean;
  storageMode: 'managed' | 'github';
};

type ShareProfile = {
  score: number | null;
  scoreEligible: boolean;
  scoreReason?: string;
  activeDays: number;
  streakDays: number;
  deliveryPoints: number;
  providers: string[];
  lifetimeTokens: number;
  tokenBreakdown: Array<{ label: string; tokens: number }>;
  sessions: number;
  updatedAt: string;
  archetype: { emoji: string; title: string; summary: string };
};

const compact = (value: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export function ActivationShare({ username, initialSettings, profile, publicOrigin }: { username: string; initialSettings: Settings; profile: ShareProfile; publicOrigin?: string }) {
  const [settings, setSettings] = useState(initialSettings);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [manualCopy, setManualCopy] = useState('');
  const [cardReady, setCardReady] = useState(false);
  const [readmeCopied, setReadmeCopied] = useState(false);
  const [readme, setReadme] = useState<ReadmeDestination | null>(null);
  const hasCodingEvidence = profile.providers.length > 0;
  const profilePath = `/u/${username}`;
  const funnelPath = cardFunnelPath(username);
  const cardPath = `/api/v1/cards/${username}?theme=${theme}`;
  const previewCardPath = `${cardPath}&v=${encodeURIComponent(profile.updatedAt)}`;

  function absoluteShareValues() {
    const origin = publicOrigin ?? window.location.origin;
    const profileUrl = `${origin}${profilePath}`;
    const funnelUrl = `${origin}${funnelPath}`;
    const cardUrl = `${origin}${cardPath}`;
    return { profileUrl, funnelUrl, cardUrl, markdown: `[![${username}'s tokpop.dev — AI workflow stats](${cardUrl})](${funnelUrl})` };
  }

  async function writeClipboard(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setManualCopy('');
      setStatus(success);
      return true;
    } catch {
      setManualCopy(value);
      setStatus('Clipboard blocked? No problem. Select and copy the text below.');
      return false;
    }
  }

  async function addToGitHub() {
    setPending(true);
    try {
    if (!settings.publicEnabled) {
      setStatus('Publishing your card…');
      const next = { ...settings, publicEnabled: true };
      const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setStatus(body.error ?? 'The card could not be published.');
        setPending(false);
        return;
      }
      setSettings(next);
    }
    setReadmeCopied(await writeClipboard(absoluteShareValues().markdown, 'Copied! Next, open the README editor below and paste your card.'));
    setCardReady(true);
    try {
      const response = await fetch('/api/v1/github/readme', { cache:'no-store' });
      if (response.ok) setReadme(await response.json() as ReadmeDestination);
    } catch { /* The manual repository link remains available. */ }
    } catch {
      setStatus('Could not finish sharing. Check your connection and try again.');
    } finally { setPending(false); }
  }

  async function joinLeaderboard() {
    setPending(true);
    try {
    const next = { ...settings, publicEnabled: true, leaderboardEnabled: true };
    const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) {
      setSettings(next);
      setStatus('You are in. Eligible profiles appear on the leaderboard automatically.');
    } else setStatus(body.error ?? 'Leaderboard opt-in failed.');
    } catch { setStatus('Could not join right now. Check your connection and try again.'); }
    finally { setPending(false); }
  }

  async function copy(kind: 'profile' | 'post' | 'html') {
    const { profileUrl, funnelUrl, cardUrl } = absoluteShareValues();
    const value = kind === 'post'
      ? `${profile.archetype.emoji} ${profile.archetype.title}\n\n${compact(profile.lifetimeTokens)} AI coding tokens · ${profile.streakDays}-day streak · ${profile.providers.length} tool${profile.providers.length === 1 ? '' : 's'} in my loadout.\n\nMake yours: ${funnelUrl}\nMy full breakdown: ${profileUrl}`
      : kind === 'html'
        ? `<a href="${funnelUrl}"><img src="${cardUrl}" alt="${username}'s AI build card — click to make yours" /></a>`
        : profileUrl;
    await writeClipboard(value, kind === 'post' ? 'Launch post copied.' : kind === 'html' ? 'HTML copied.' : 'Profile link copied.');
  }

  return <section className="activation-grid">
    <article className="activation-preview">
      <div className="activation-card-head"><span>YOUR BUILD DROP</span><b>{settings.publicEnabled ? 'LIVE ●' : 'PRIVATE PREVIEW'}</b></div>
      {settings.publicEnabled
        ? <Image src={previewCardPath} width={640} height={252} unoptimized alt={`${username}'s live AI build card`}/>
        : <div className={`private-card-preview build-pass ${theme}`}>
          <div className="build-pass-identity">
            <div className="build-pass-brand"><span>tokpop.dev</span><b>PRIVATE</b></div>
            <strong>@{username}</strong>
            <p><span>{profile.archetype.emoji}</span>{profile.archetype.title}</p>
            <small>{hasCodingEvidence ? 'YOUR CONNECTED TOOLS' : 'GITHUB STARTER CARD'}</small>
            <em>{profile.providers.join(' · ') || 'GitHub starter card'}</em>
          </div>
          <div className="build-pass-story">
            <div className="build-pass-story-head"><span>YOUR AI BUILD STORY</span><b>MAKE YOURS ↗</b></div>
            <strong>{compact(profile.lifetimeTokens)}</strong>
            <small>OBSERVED AI CODING TOKENS</small>
            <dl><div><dt>Build level</dt><dd>{profile.score ?? '—'}</dd></div><div><dt>Active days</dt><dd>{profile.activeDays}</dd></div><div><dt>Current streak</dt><dd>{profile.streakDays}d</dd></div></dl>
            <div className="build-pass-loadout">{profile.tokenBreakdown.length ? profile.tokenBreakdown.map((item) => <span key={item.label}><small>{item.label}</small><b>{compact(item.tokens)}</b></span>) : <p>Connect coding activity to unlock exact tool totals.</p>}</div>
          </div>
        </div>}
      <p className="activation-card-note">Paste it once. New syncs update this same card.</p>
    </article>

    <article className={`activation-share-panel ${hasCodingEvidence ? '' : 'starter-share'}`}>
      <p className="eyebrow">Flex mode: on</p>
      <h2>{hasCodingEvidence ? 'Make it yours.' : 'Your GitHub starter card.'}</h2>
      <p className="share-panel-intro">{hasCodingEvidence ? 'Pick a look. Publish & copy your card. Paste it into your GitHub profile README.' : 'This version has no coding activity yet. You can connect your tools later.'}</p>

      <div className="card-vibe-picker" aria-label="Card theme">
        <button type="button" aria-pressed={theme === 'dark'} className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><span className="vibe-swatch punch"/><span><b>Hyper</b><small>Violet + bubblegum</small></span></button>
        <button type="button" aria-pressed={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><span className="vibe-swatch clean"/><span><b>Fresh</b><small>Blue + turbo mint</small></span></button>
      </div>

      <button type="button" className="publish-copy-button" onClick={addToGitHub} disabled={pending}>{pending ? 'Getting it ready…' : settings.publicEnabled ? 'Copy README card' : 'Publish & copy my card'} <span>→</span></button>
      {!settings.publicEnabled ? <p className="share-action-hint">This makes your profile and stats card public. Prompts and code stay private. Joining the leaderboard is a separate choice.</p> : null}
      {manualCopy ? <label className="share-manual-copy">Copy this text<textarea readOnly value={manualCopy} onFocus={(event) => event.currentTarget.select()} rows={4}/></label> : null}
      {cardReady ? <div className="share-finish" role="status"><strong>{readmeCopied ? 'One last paste. Make it official ✨' : 'Copy the Markdown above, then paste it on GitHub.'}</strong><p>{readme?.instruction ?? 'Open your profile repository, edit or create its README, paste your card, then commit your changes.'}</p><a className="secondary-link" href={readme?.url ?? `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(username)}`} target="_blank" rel="noreferrer">{readme?.label ?? 'Open profile repository'} ↗</a><p>We never edit your repository. Copying the card does not install it on GitHub.</p></div> : null}
      <details className="share-more"><summary>More ways to share</summary><div className="quick-share-actions">
        <button type="button" onClick={() => copy('profile')} disabled={!settings.publicEnabled}>Copy profile link</button>
        <button type="button" onClick={() => copy('post')} disabled={!settings.publicEnabled}>Copy launch post</button>
        <button type="button" onClick={() => copy('html')} disabled={!settings.publicEnabled}>Copy HTML</button>
      </div></details>

      {!hasCodingEvidence ? <div className="power-up-nudge"><span>⚡</span><p><strong>Want the impressive version?</strong><small>Connect your coding tools above and this card powers up automatically.</small></p><a href="#power-up">Power it up ↑</a></div> : <div className="power-up-nudge connected"><span>✓</span><p><strong>Coding tools connected</strong><small>{profile.providers.join(' · ')}</small></p><Link href="/connections">Manage →</Link></div>}

      <div className="share-trust-line"><span>{settings.publicEnabled ? '🌐 Public stats card' : '🔒 Private until published'}</span><span>🧼 No prompts or code</span></div>
      {status ? <p className="status-line" aria-live="polite">{status}</p> : null}
      {settings.publicEnabled ? <div className="post-share-loop"><Link className="open-profile-link" href={profilePath}>Open my live profile ↗</Link>{settings.leaderboardEnabled ? <Link href="/leaderboard">View leaderboard →</Link> : <button type="button" onClick={joinLeaderboard} disabled={pending}>Join the leaderboard →</button>}</div> : null}
    </article>
  </section>;
}
