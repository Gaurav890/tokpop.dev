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
};

export function ActivationShare({ username, initialSettings, profile }: { username: string; initialSettings: Settings; profile: ShareProfile }) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const hasCodingEvidence = profile.providers.length > 0;
  const profilePath = `/u/${username}`;
  const cardPath = `/api/v1/cards/${username}?theme=dark`;
  const previewProviders = profile.providers.length > 2 ? `${profile.providers.slice(0, 2).join(' · ')} · +${profile.providers.length - 2} more` : profile.providers.join(' · ') || 'GitHub starter only';

  async function publish() {
    setPending(true);
    setStatus('Publishing your profile…');
    const next = { ...settings, publicEnabled: true };
    const response = await fetch('/api/v1/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) });
    const body = await response.json().catch(() => ({})) as { error?: string };
    if (response.ok) {
      setSettings(next);
      setStatus('Profile published. Your card is ready to share.');
    } else setStatus(body.error ?? 'The profile could not be published.');
    setPending(false);
  }

  async function copy(kind: 'readme' | 'profile' | 'post') {
    const origin = window.location.origin;
    const profileUrl = `${origin}${profilePath}`;
    const cardUrl = `${origin}${cardPath}`;
    const value = kind === 'readme'
      ? `[![AI Native Profile](${cardUrl})](${profileUrl})`
      : kind === 'post'
        ? `I made my coding-agent workflow visible: ${profileUrl}\n\nCoverage and provenance are shown on every signal. Activity is evidence of workflow adoption—not a measure of developer skill.`
        : profileUrl;
    await navigator.clipboard.writeText(value);
    setStatus(kind === 'readme' ? 'README Markdown copied.' : kind === 'post' ? 'Launch post copied.' : 'Profile link copied.');
  }

  return <section className="activation-grid">
    <article className="activation-preview">
      <div className="activation-card-head"><span>LIVE README CARD</span><b>{settings.publicEnabled ? 'PUBLIC' : 'PREVIEW'}</b></div>
      {settings.publicEnabled
        ? <Image src={cardPath} width={640} height={210} unoptimized alt={`${username}'s live profile card`}/>
        : <div className="private-card-preview">
          <div><span className="brand-mark">anp/</span><strong>@{username}</strong></div>
          <p><b>{profile.score ?? '—'}</b><span>/100 workflow index</span></p>
          <dl><div><dt>Active days</dt><dd>{profile.activeDays}</dd></div><div><dt>Current streak</dt><dd>{profile.streakDays} days</dd></div><div><dt>Sources</dt><dd>{previewProviders}</dd></div></dl>
          <small>Coverage-labelled evidence · private preview</small>
        </div>}
      <p className="activation-card-note">The card stays current as new eligible activity arrives. It links back to the profile where visitors can inspect source coverage.</p>
    </article>

    <article className="activation-checklist">
      <p className="eyebrow">Share readiness</p>
      <h2>{hasCodingEvidence ? 'This profile has coding evidence.' : 'Add coding evidence for a stronger first share.'}</h2>
      <div className="readiness-list">
        <div className="ready"><span>01</span><p><strong>GitHub identity</strong><small>Connected and verified</small></p></div>
        <div className={hasCodingEvidence ? 'ready' : 'attention'}><span>02</span><p><strong>Coding activity</strong><small>{hasCodingEvidence ? profile.providers.join(', ') : 'No eligible coding source yet'}</small></p></div>
        <div className={profile.scoreEligible ? 'ready' : 'attention'}><span>03</span><p><strong>Ranked score</strong><small>{profile.scoreEligible ? `${profile.score}/100 · eligible` : profile.scoreReason ?? 'Requires GitHub and 30 covered days'}</small></p></div>
        <div className={settings.publicEnabled ? 'ready' : ''}><span>04</span><p><strong>Public visibility</strong><small>{settings.publicEnabled ? 'Published' : 'Private until you confirm'}</small></p></div>
      </div>

      {!hasCodingEvidence && <div className="activation-advice"><strong>Best next step</strong><p>Connect one coding source before posting the card. A GitHub-only starter profile is accurate, but it does not yet demonstrate an AI coding workflow.</p><Link href="/connect" className="secondary-link compact-link">Connect coding activity</Link></div>}

      <div className="activation-actions">
        {!settings.publicEnabled && <button type="button" className="primary-button" onClick={publish} disabled={pending}>{pending ? 'Publishing…' : hasCodingEvidence ? 'Publish my profile' : 'Publish starter profile'}</button>}
        {settings.publicEnabled && <>
          <button type="button" className="primary-button" onClick={() => copy('readme')}>Copy README card</button>
          <button type="button" className="secondary-button" onClick={() => copy('profile')}>Copy profile link</button>
          <button type="button" className="secondary-button" onClick={() => copy('post')}>Copy launch post</button>
          <Link className="text-link" href={profilePath}>Open public profile →</Link>
        </>}
      </div>
      {status && <p className="status-line" aria-live="polite">{status}</p>}
    </article>
  </section>;
}
