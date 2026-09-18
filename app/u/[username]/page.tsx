import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '../../../lib/profile';
import { SiteHeader } from '../../ui/site-header';
import { ShareBox } from '../../ui/share-box';
import Link from '../../ui/native-link';
import Image from 'next/image';
import { currentGitHubUser } from '../../../lib/auth';

function compact(value: number) { return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: 'Profile not found — AI Native Profile' };
  return { title: `${profile.name} (@${profile.username}) — AI Native Profile`, description: `${profile.scoreEligible ? `${profile.score}/100 AI Workflow Index` : 'Coverage-labelled AI workflow'} · ${profile.activeDays} active coding days · ${profile.providers.join(', ')}`, openGraph: { images: [{ url: `/api/v1/cards/${profile.username}?theme=dark&format=og`, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image', images: [`/api/v1/cards/${profile.username}?theme=dark&format=og`] } };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [profile, user] = await Promise.all([getPublicProfile(username), currentGitHubUser()]);
  if (!profile) notFound();
  return <main className="profile-page"><SiteHeader user={user}/><section className="profile-hero">
    <div className="identity"><span className="profile-avatar">{profile.avatarUrl ? <Image src={profile.avatarUrl} width={88} height={88} alt=""/> : profile.name.slice(0, 2).toUpperCase()}</span><div><p className="verified-line">● {profile.verified ? 'GITHUB VERIFIED' : 'LABELLED EXAMPLE'}</p><h1>{profile.name}</h1><p>@{profile.username} · Updated {new Date(profile.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div>
    <div className="index-badge"><span>AI WORKFLOW INDEX</span><strong>{profile.scoreEligible ? profile.score : '—'}</strong><small>/100</small><Link href="/methodology">{profile.scoreEligible ? 'View methodology →' : 'Insufficient coverage →'}</Link></div>
  </section>
  <section className="profile-strip"><div><strong>{compact(profile.lifetimeTokens)}</strong><span>coding tokens</span></div><div><strong>{profile.activeDays}</strong><span>active days</span></div><div><strong>{profile.currentStreak}d</strong><span>current streak</span></div><div><strong>{profile.deliveryPoints}</strong><span>delivery points</span></div><div><strong>#{profile.rank || '—'}</strong><span>rank</span></div></section>
  <section className="profile-grid"><article className="public-card wide"><div className="section-title"><div><p className="eyebrow">Coding activity · 12 weeks</p><h2>Consistent, evidence-backed practice</h2></div><span className="proof-chip">{profile.verified ? 'Competitive eligible' : 'Example scoring'}</span></div><div className="public-heatmap">{profile.activity.map((day) => <span key={day.date} className={`heat level-${day.value}`} title={`${day.date}: level ${day.value}`}/>)}</div><div className="provider-row">{profile.providers.map((provider) => <span key={provider}>{provider}</span>)}</div></article>
  <article className="public-card"><p className="eyebrow">GitHub delivery · 90 days</p><h2>Shipped work</h2><dl className="delivery-list"><div><dt>Commits</dt><dd>{profile.github.commits}</dd></div><div><dt>Merged PRs</dt><dd>{profile.github.mergedPullRequests}</dd></div><div><dt>Reviews</dt><dd>{profile.github.reviews}</dd></div><div><dt>Releases</dt><dd>{profile.github.releases}</dd></div></dl><p className="fine-print">Correlated by time window. No claim that a specific commit was AI-generated.</p></article>
  <article className="public-card"><p className="eyebrow">Provenance</p><h2>What this profile can prove</h2><div className="provenance-list">{profile.coverage.map((item) => <div key={item.source}><span className={`status-dot ${item.status.toLowerCase()}`}/><span><strong>{item.label}</strong><small>{item.provenance} · {item.completeness}</small></span></div>)}</div></article>
  <article className="public-card conversation-card"><div><p className="eyebrow">Conversation activity</p><h2>Optional, separate, non-competitive</h2><p>{profile.conversation.sessions} deliberately observed or imported sessions across {profile.conversation.activeDays} days.</p></div><span className="excluded-label">Excluded from score</span><p className="fine-print">{profile.conversation.coverage}. MCP does not silently read ChatGPT or Claude history.</p></article></section>
  <ShareBox username={profile.username}/><aside className="disclaimer"><strong>Workflow adoption ≠ developer competence.</strong><span>This profile shows attributable tool use and delivery signals. It is not a measure of code quality, judgment, or employability.</span></aside>
  <section className="profile-conversion"><div><p className="eyebrow">Build yours</p><h2>Make your workflow portable.</h2><p>Connect GitHub, add the evidence sources you choose, and publish only when the profile is ready.</p></div><div><Link className="primary-link" href={user ? '/share' : `/api/auth/github/start?return_to=${encodeURIComponent('/connect?onboarding=1')}`}>{user ? 'Publish my profile' : 'Create my profile'} →</Link><a className="secondary-link" href="https://github.com/Gaurav890/ai-native-profile" target="_blank" rel="noreferrer">View open-source repo ↗</a></div></section>
  </main>;
}
