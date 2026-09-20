import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '../../../lib/profile';
import { SiteHeader } from '../../ui/site-header';
import { ShareBox } from '../../ui/share-box';
import Link from '../../ui/native-link';
import Image from 'next/image';
import { currentGitHubUser } from '../../../lib/auth';

function compact(value: number) { return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
function exact(value: number) { return new Intl.NumberFormat('en-US').format(value); }
function calendarDate(value: string) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }

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
  const scoreParts = [
    ['Consistency', profile.scoreBreakdown.consistency, 30],
    ['Workflow depth', profile.scoreBreakdown.workflowDepth, 25],
    ['Provider breadth', profile.scoreBreakdown.providerBreadth, 15],
    ['GitHub delivery', profile.scoreBreakdown.delivery, 30],
  ] as const;
  const activityTotals = [
    ['Sessions', profile.activityTotals.sessions],
    ['Turns', profile.activityTotals.turns],
    ['Tool calls', profile.activityTotals.toolCalls],
    ['Skill uses', profile.activityTotals.skillUses],
    ['Commands', profile.activityTotals.commandUses],
    ['Agent runs', profile.activityTotals.agentRuns],
  ] as const;
  return <main className="profile-page"><SiteHeader user={user}/><section className="profile-hero">
    <div className="profile-identity-stack"><div className="identity"><span className="profile-avatar">{profile.avatarUrl ? <Image src={profile.avatarUrl} width={88} height={88} alt=""/> : profile.name.slice(0, 2).toUpperCase()}</span><div><p className="verified-line">● {profile.verified ? 'GITHUB VERIFIED' : 'LABELLED EXAMPLE'}</p><h1>{profile.name}</h1><p>@{profile.username} · Updated {new Date(profile.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div><div className="profile-archetype"><span aria-hidden="true">{profile.archetype.emoji}</span><div><small>WORKFLOW ARCHETYPE</small><strong>{profile.archetype.title}</strong><p>{profile.archetype.summary}</p></div></div></div>
    <div className="index-badge"><span>AI WORKFLOW INDEX</span><strong>{profile.scoreEligible ? profile.score : '—'}</strong><small>/100</small><Link href="/methodology">{profile.scoreEligible ? 'View methodology →' : 'Insufficient coverage →'}</Link></div>
  </section>
  <section className="profile-strip"><div><strong>{compact(profile.lifetimeTokens)}</strong><span>observed coding tokens</span></div><div><strong>{profile.sessions}</strong><span>recorded sessions</span></div><div><strong>{profile.activeDays}</strong><span>active days</span></div><div><strong>{profile.currentStreak}d</strong><span>current streak</span></div><div><strong>{profile.providers.length}</strong><span>coding providers</span></div></section>
  <section className="profile-grid">
  <article className="public-card token-ledger"><div className="section-title"><div><p className="eyebrow">Token ledger · covered period</p><h2>{exact(profile.lifetimeTokens)} observed tokens</h2></div><span className="token-spark" aria-hidden="true">⚡</span></div><p className="card-intro">A transparent total of token metrics reported by eligible coding sources. Provider definitions can differ, so each source stays visible.</p><div className="token-source-list">{profile.tokenBreakdown.length ? profile.tokenBreakdown.map((item) => <div key={item.source}><div><strong>{item.label}</strong><span>{item.provenance}</span></div><b>{exact(item.tokens)}<small>{profile.lifetimeTokens ? (item.tokens / profile.lifetimeTokens * 100).toFixed(1) : '0.0'}% of total</small></b><span className="token-bar"><i style={{ width: `${Math.max(4, profile.lifetimeTokens ? item.tokens / profile.lifetimeTokens * 100 : 0)}%` }}/></span></div>) : <p>No token-reporting source is connected yet.</p>}</div><div className="activity-mini-grid">{activityTotals.map(([label, value]) => <div key={label}><strong>{compact(value)}</strong><span>{label}</span></div>)}</div></article>
  <article className="public-card score-ledger"><div className="section-title"><div><p className="eyebrow">Why the score is {profile.scoreEligible ? profile.score : 'unranked'}</p><h2>Four signals, fully inspectable</h2></div><span className="proof-chip">Tokens excluded</span></div><div className="score-part-list">{scoreParts.map(([label, value, max]) => <div key={label}><div><span>{label}</span><strong>{value}/{max}</strong></div><span className="score-part-track"><i style={{ width: `${Math.min(100, value / max * 100)}%` }}/></span></div>)}</div><p className="fine-print">Raw token volume never raises the workflow score. <Link href="/methodology">See the complete formula →</Link></p></article>
  <article className="public-card wide daily-token-ledger"><div className="section-title"><div><p className="eyebrow">Daily token history · up to 365 days</p><h2>Exactly which provider used how much, each day</h2></div><span className="proof-chip">Reconciles to total</span></div><p className="card-intro">Each row comes from the same de-duplicated provider metrics used above. Scroll to inspect every token-bearing day in the covered period.</p>{profile.dailyTokens.length ? <div className="daily-token-table-wrap"><table className="daily-token-table"><thead><tr><th scope="col">Date</th>{profile.tokenBreakdown.map((provider) => <th scope="col" key={provider.source}>{provider.label}</th>)}<th scope="col">Daily total</th></tr></thead><tbody>{profile.dailyTokens.map((day) => <tr key={day.date}><th scope="row"><time dateTime={day.date}>{calendarDate(day.date)}</time></th>{profile.tokenBreakdown.map((provider) => <td key={provider.source}>{exact(day.bySource[provider.source] ?? 0)}</td>)}<td className="daily-total">{exact(day.total)}</td></tr>)}</tbody></table></div> : <p className="empty-ledger">No date-level token data has been reported yet.</p>}</article>
  <article className="public-card wide"><div className="section-title"><div><p className="eyebrow">Coding activity · 12 weeks</p><h2>Consistent, evidence-backed practice</h2></div><span className="proof-chip">{profile.verified ? 'Competitive eligible' : 'Example scoring'}</span></div><div className="public-heatmap">{profile.activity.map((day) => <span key={day.date} className={`heat level-${day.value}`} title={`${day.date}: level ${day.value}`}/>)}</div><div className="provider-row" aria-label="All connected coding providers">{profile.providers.map((provider) => <span key={provider}>{provider}</span>)}</div></article>
  <article className="public-card"><p className="eyebrow">GitHub delivery · 90 days</p><h2>Shipped work</h2><dl className="delivery-list"><div><dt>Commits</dt><dd>{profile.github.commits}</dd></div><div><dt>Merged PRs</dt><dd>{profile.github.mergedPullRequests}</dd></div><div><dt>Reviews</dt><dd>{profile.github.reviews}</dd></div><div><dt>Releases</dt><dd>{profile.github.releases}</dd></div></dl><p className="fine-print">Correlated by time window. No claim that a specific commit was AI-generated.</p></article>
  <article className="public-card"><p className="eyebrow">Provenance</p><h2>What this profile can prove</h2><div className="provenance-list">{profile.coverage.map((item) => <div key={item.source}><span className={`status-dot ${item.status.toLowerCase()}`}/><span><strong>{item.label}</strong><small>{item.provenance} · {item.completeness}</small></span></div>)}</div></article>
  <article className="public-card conversation-card"><div><p className="eyebrow">Conversation activity</p><h2>{profile.conversation.sessions ? 'Optional, separate, non-competitive' : 'No conversation history connected'}</h2><p>{profile.conversation.sessions ? `${profile.conversation.sessions} deliberately observed or imported sessions across ${profile.conversation.activeDays} days.` : 'ChatGPT and Claude web activity appears only after an explicit MCP observation or privacy-preserving export import.'}</p></div><span className="excluded-label">Excluded from score</span><p className="fine-print">{profile.conversation.coverage}. MCP does not silently read ChatGPT or Claude history.</p></article></section>
  <ShareBox username={profile.username}/><aside className="disclaimer"><strong>Workflow adoption ≠ developer competence.</strong><span>This profile shows attributable tool use and delivery signals. It is not a measure of code quality, judgment, or employability.</span></aside>
  <section className="profile-conversion"><div><p className="eyebrow">Build yours</p><h2>Make your workflow portable.</h2><p>Connect GitHub, add the evidence sources you choose, and publish only when the profile is ready.</p></div><div><Link className="primary-link" href={user ? '/share' : `/api/auth/github/start?return_to=${encodeURIComponent('/connect?onboarding=1')}`}>{user ? 'Publish my profile' : 'Create my profile'} →</Link><a className="secondary-link" href="https://github.com/Gaurav890/ai-native-profile" target="_blank" rel="noreferrer">View open-source repo ↗</a></div></section>
  </main>;
}
