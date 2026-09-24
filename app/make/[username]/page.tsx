import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { currentGitHubUser } from '../../../lib/auth';
import { previewCardPath } from '../../../lib/card-cache';
import { getPublicProfile } from '../../../lib/profile';
import Link from '../../ui/native-link';
import { SiteFooter } from '../../ui/site-footer';
import { SiteHeader } from '../../ui/site-header';

export const dynamic = 'force-dynamic';

const getFunnelProfile = cache(getPublicProfile);

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getFunnelProfile(username);
  if (!profile) return { title: 'Make your live build card' };
  return {
    title: `Make your live build card — inspired by @${profile.username}`,
    description: `You found @${profile.username}'s live build card. Create your own, connect your coding tools, and copy it into your README.`,
  };
}

export default async function MakeCardPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [profile, user] = await Promise.all([getFunnelProfile(username), currentGitHubUser()]);
  if (!profile) notFound();

  const shareDestination = `/share?onboarding=1&from=${encodeURIComponent(profile.username)}`;
  const makeCardHref = user
    ? shareDestination
    : `/api/auth/github/start?return_to=${encodeURIComponent(shareDestination)}`;
  const profileHref = `/u/${encodeURIComponent(profile.username)}`;

  return <main className="marketing-page make-page">
    <SiteHeader user={user}/>

    <section className="make-hero">
      <div className="make-copy">
        <span className="make-origin">FOUND IN @{profile.username}&apos;S README <b>↗</b></span>
        <p className="eyebrow">Now it&apos;s your turn</p>
        <h1>Build your own<br/><span>live flex card.</span></h1>
        <p className="make-intro">You found @{profile.username}&apos;s build card. Create yours, reveal your tool loadout, and turn every README click into the next builder.</p>
        <div className="make-actions">
          <Link className="make-primary" href={makeCardHref}>{user ? 'Open my card' : 'Make my card'} <span>→</span></Link>
          <Link className="make-secondary" href={profileHref}>See @{profile.username}&apos;s full stats</Link>
        </div>
        <div className="make-trust" aria-label="Setup promises">
          <span>✓ GitHub sign-in</span>
          <span>✓ Private until published</span>
          <span>✓ No prompts or source code</span>
        </div>
      </div>

      <div className="make-preview-wrap">
        <span className="make-preview-sticker">YOUR TURN<br/>NEXT ↓</span>
        <div className="make-preview-label"><span>LIVE BUILD DROP</span><b>@{profile.username}</b></div>
        <Image
          className="make-preview-card"
          src={previewCardPath(profile.username, 'dark', profile.updatedAt)}
          width={640}
          height={252}
          unoptimized
          priority
          alt={`${profile.username}'s live build card`}
        />
        <p>Same energy. Your stats. Your README.</p>
      </div>
    </section>

    <section className="make-steps" aria-labelledby="make-steps-title">
      <div className="make-steps-head">
        <p className="eyebrow">From click to card</p>
        <h2 id="make-steps-title">Three quick moves. One live identity.</h2>
      </div>
      <ol>
        <li><span>01</span><div><strong>Claim your card</strong><p>Sign in with GitHub and get a private starter card immediately.</p></div></li>
        <li><span>02</span><div><strong>Power it up</strong><p>One command finds supported coding tools and previews exactly what is shared.</p></div></li>
        <li><span>03</span><div><strong>Drop it in your README</strong><p>Copy your live banner. Its stats update while its link brings the next builder in.</p></div></li>
      </ol>
    </section>

    <section className="make-final">
      <div><span aria-hidden="true">⚡</span><p className="eyebrow">Ready player next</p><h2>What will your build alter ego be?</h2></div>
      <Link className="make-primary" href={makeCardHref}>{user ? 'Go to my card' : 'Reveal my card'} <span>→</span></Link>
    </section>

    <SiteFooter/>
  </main>;
}
