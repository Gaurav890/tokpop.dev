'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from '../ui/native-link';

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

export function ActivationShare({ username, initialSettings, profile }: { username: string; initialSettings: Settings; profile: ShareProfile }) {
  const [settings, setSettings] = useState(initialSettings);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const hasCodingEvidence = profile.providers.length > 0;
  const profilePath = `/u/${username}`;
  const cardPath = `/api/v1/cards/${username}?theme=${theme}`;
  const previewCardPath = `${cardPath}&v=${encodeURIComponent(profile.updatedAt)}`;

  function absoluteShareValues() {
    const origin = window.location.origin;
    const profileUrl = `${origin}${profilePath}`;
    const cardUrl = `${origin}${cardPath}`;
    return { profileUrl, cardUrl, markdown: `[![${username}'s AI build card](${cardUrl})](${profileUrl})` };
  }

  async function writeClipboard(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(success);
      return true;
    } catch {
      setStatus('Your profile is live. Use the copy button again to copy the card.');
      return false;
    }
  }

  async function addToGitHub() {
    const githubTab = window.open('', '_blank');
    if (githubTab) githubTab.opener = null;
    setPending(true);
    if (!settings.publicEnabled) {
      setStatus('Publishing your card…');
      const next = { ...settings, publicEnabled: true };
      const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        githubTab?.close();
        setStatus(body.error ?? 'The card could not be published.');
        setPending(false);
        return;
      }
      setSettings(next);
    }
    const copied = await writeClipboard(absoluteShareValues().markdown, 'Card copied. Opening your GitHub profile repository…');
    if (copied && githubTab) githubTab.location.href = `https://github.com/${encodeURIComponent(username)}/${encodeURIComponent(username)}`;
    else githubTab?.close();
    setPending(false);
  }

  async function joinLeaderboard() {
    setPending(true);
    const next = { ...settings, publicEnabled: true, leaderboardEnabled: true };
    const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) {
      setSettings(next);
      setStatus('You are in. Eligible profiles appear on the leaderboard automatically.');
    } else setStatus(body.error ?? 'Leaderboard opt-in failed.');
    setPending(false);
  }

  async function copy(kind: 'profile' | 'post' | 'html') {
    const { profileUrl, cardUrl } = absoluteShareValues();
    const value = kind === 'post'
      ? `${profile.archetype.emoji} ${profile.archetype.title}\n\n${compact(profile.lifetimeTokens)} AI coding tokens · ${profile.streakDays}-day streak · ${profile.providers.length} tool${profile.providers.length === 1 ? '' : 's'} in my loadout.\n\nMake yours: ${profileUrl}`
      : kind === 'html'
        ? `<a href="${profileUrl}"><img src="${cardUrl}" alt="${username}'s AI build card" /></a>`
        : profileUrl;
    await writeClipboard(value, kind === 'post' ? 'Launch post copied.' : kind === 'html' ? 'HTML copied.' : 'Profile link copied.');
  }

  return <section className="activation-grid">
    <article className="activation-preview">
      <div className="activation-card-head"><span>YOUR LIVE BUILD CARD</span><b>{settings.publicEnabled ? 'LIVE ●' : 'PRIVATE PREVIEW'}</b></div>
      {settings.publicEnabled
        ? <Image src={previewCardPath} width={640} height={282} unoptimized alt={`${username}'s live AI build card`}/>
        : <div className={`private-card-preview arcade-card ${theme}`}>
          <div className="arcade-card-top"><span className="brand-mark">anp/</span><span><small>AI BUILD CARD</small><strong>@{username}</strong></span><b>PREVIEW</b></div>
          <div className="arcade-card-body">
            <div className="arcade-card-hero">
              <p><span>{profile.archetype.emoji}</span><strong>{profile.archetype.title}</strong></p>
              <b>{compact(profile.lifetimeTokens)}</b>
              <small>AI CODING TOKENS</small>
              <dl><div><dt>Build level</dt><dd>{profile.score ?? '—'}</dd></div><div><dt>Active days</dt><dd>{profile.activeDays}</dd></div><div><dt>Streak</dt><dd>{profile.streakDays}d</dd></div></dl>
            </div>
            <div className="arcade-loadout">
              <span>TOOL LOADOUT</span>
              {profile.tokenBreakdown.length ? profile.tokenBreakdown.map((item) => <div key={item.label}><strong>{item.label}</strong><b>{compact(item.tokens)}</b></div>) : <p>Connect coding activity to unlock your loadout.</p>}
              <small>{profile.providers.join(' · ') || 'GitHub starter card'}</small>
            </div>
          </div>
          <div className="arcade-card-foot"><span>LIVE STATS · SOURCE-LABELLED</span><b>MAKE YOURS ↗</b></div>
        </div>}
      <p className="activation-card-note">Your card stays fresh as new activity arrives. Clicking it opens the full day-by-day breakdown.</p>
    </article>

    <article className={`activation-share-panel ${hasCodingEvidence ? '' : 'starter-share'}`}>
      <p className="eyebrow">Add it anywhere</p>
      <h2>{hasCodingEvidence ? 'Pick a vibe. Add it to GitHub.' : 'Your starter card can wait.'}</h2>
      <p className="share-panel-intro">{hasCodingEvidence ? 'The card links to your exact provider and daily breakdown. It keeps updating without changing the Markdown.' : 'Connect coding activity above for the version worth sharing. You can still publish the GitHub-only starter card.'}</p>

      <div className="card-vibe-picker" aria-label="Card theme">
        <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><span className="vibe-swatch midnight"/>Midnight</button>
        <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><span className="vibe-swatch daylight"/>Daylight</button>
      </div>

      <button type="button" className="publish-copy-button" onClick={addToGitHub} disabled={pending}>{pending ? 'Getting it ready…' : hasCodingEvidence ? 'Add to GitHub README' : 'Publish starter card'} <span>→</span></button>
      <details className="share-more"><summary>More ways to share</summary><div className="quick-share-actions">
        <button type="button" onClick={() => copy('profile')} disabled={!settings.publicEnabled}>Copy profile link</button>
        <button type="button" onClick={() => copy('post')} disabled={!settings.publicEnabled}>Copy launch post</button>
        <button type="button" onClick={() => copy('html')} disabled={!settings.publicEnabled}>Copy HTML</button>
      </div></details>

      {!hasCodingEvidence ? <div className="power-up-nudge"><span>⚡</span><p><strong>Want the impressive version?</strong><small>Connect your coding tools below and this card powers up automatically.</small></p><a href="#power-up">Power it up ↓</a></div> : <div className="power-up-nudge connected"><span>✓</span><p><strong>Live coding stats connected</strong><small>{profile.providers.join(' · ')}</small></p><a href="#power-up">Manage ↓</a></div>}

      <div className="share-trust-line"><span>🔒 Private until published</span><span>🧼 No prompts or code</span></div>
      {status ? <p className="status-line" aria-live="polite">{status}</p> : null}
      {settings.publicEnabled ? <div className="post-share-loop"><Link className="open-profile-link" href={profilePath}>Open my live profile ↗</Link>{settings.leaderboardEnabled ? <Link href="/leaderboard">View leaderboard →</Link> : <button type="button" onClick={joinLeaderboard} disabled={pending}>Join the leaderboard →</button>}</div> : null}
    </article>
  </section>;
}
