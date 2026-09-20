import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicProfile } from '../../../lib/profile';
import { SiteHeader } from '../../ui/site-header';
import { ShareBox } from '../../ui/share-box';
import Link from '../../ui/native-link';
import Image from 'next/image';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteFooter } from '../../ui/site-footer';

function compact(value: number) { return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value); }
function exact(value: number) { return new Intl.NumberFormat('en-US').format(value); }
function calendarDate(value: string) { return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
function percent(value: number, total: number) { const result = total ? value / total * 100 : 0; return result > 0 && result < .1 ? '<0.1' : result.toFixed(1); }

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: 'Profile not found — AI Native Profile' };
  return { title: `${profile.name} (@${profile.username}) — AI Native Profile`, description: `${profile.scoreEligible ? `Build level ${profile.score}` : 'Live AI build card'} · ${profile.activeDays} active coding days · ${profile.providers.join(', ')}`, openGraph: { images: [{ url: `/api/v1/cards/${profile.username}?theme=dark&format=og`, width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image', images: [`/api/v1/cards/${profile.username}?theme=dark&format=og`] } };
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
  const allActivityTotals: Array<[string, number]> = [
    ['Sessions', profile.activityTotals.sessions],
    ['Turns', profile.activityTotals.turns],
    ['Tool calls', profile.activityTotals.toolCalls],
    ['Skill uses', profile.activityTotals.skillUses],
    ['Commands', profile.activityTotals.commandUses],
    ['Agent runs', profile.activityTotals.agentRuns],
  ];
  const activityTotals = allActivityTotals.filter(([, value]) => value > 0);
  const headlineStats = [
    { value: compact(profile.lifetimeTokens), label: 'AI coding tokens', visible: profile.lifetimeTokens > 0 },
    { value: profile.sessions, label: 'coding sessions', visible: profile.sessions > 0 },
    { value: profile.activeDays, label: 'active days', visible: profile.activeDays > 0 },
    { value: `${profile.currentStreak}d`, label: 'current streak', visible: profile.currentStreak > 0 },
    { value: profile.providers.length, label: 'tools connected', visible: profile.providers.length > 0 },
  ].filter((item) => item.visible);
  const deliveryTotal = profile.github.commits + profile.github.mergedPullRequests + profile.github.reviews + profile.github.releases;
  return <main className="profile-page"><SiteHeader user={user}/><section className="profile-hero">
    <div className="profile-identity-stack"><div className="identity"><span className="profile-avatar">{profile.avatarUrl ? <Image src={profile.avatarUrl} width={88} height={88} alt=""/> : profile.name.slice(0, 2).toUpperCase()}</span><div><p className="verified-line">● {profile.verified ? 'GITHUB VERIFIED' : 'LABELLED EXAMPLE'}</p><h1>{profile.name}</h1><p>@{profile.username} · Updated {new Date(profile.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div></div><div className="profile-archetype"><span aria-hidden="true">{profile.archetype.emoji}</span><div><small>BUILD ALTER EGO</small><strong>{profile.archetype.title}</strong><p>{profile.archetype.summary}</p></div></div></div>
    <div className="index-badge"><span>BUILD LEVEL</span><strong>{profile.scoreEligible ? profile.score : '—'}</strong><small>/100</small><a href="#build-level">{profile.scoreEligible ? 'See breakdown ↓' : 'Keep building ↓'}</a></div>
  </section>
  {headlineStats.length ? <section className={`profile-strip stats-${headlineStats.length}`}>{headlineStats.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</section> : null}
  <section className="profile-grid">
  {profile.lifetimeTokens > 0 ? <article className="public-card token-ledger wide"><div className="section-title"><div><p className="eyebrow">Tool loadout · covered period</p><h2>{exact(profile.lifetimeTokens)} AI coding tokens</h2></div><span className="token-spark" aria-hidden="true">⚡</span></div><p className="card-intro">Every token-reporting tool keeps its own row, percentage, and source label. Provider definitions can differ, so totals are never blended invisibly.</p><div className="token-source-list">{profile.tokenBreakdown.map((item) => <div key={item.source}><div><strong>{item.label}</strong><span>{item.provenance}</span></div><b>{exact(item.tokens)}<small>{percent(item.tokens, profile.lifetimeTokens)}% of total</small></b><span className="token-bar"><i style={{ width: `${Math.max(4, profile.lifetimeTokens ? item.tokens / profile.lifetimeTokens * 100 : 0)}%` }}/></span>{item.components && (item.components.input + item.components.output + item.components.cacheCreation + item.components.cacheRead > 0) ? <dl className="token-components"><div><dt>Base input</dt><dd>{exact(item.components.input)}</dd></div><div><dt>Output</dt><dd>{exact(item.components.output)}</dd></div><div><dt>Cache write</dt><dd>{exact(item.components.cacheCreation)}</dd></div><div><dt>Cache read</dt><dd>{exact(item.components.cacheRead)}</dd></div>{item.components.combinedOnly > 0 ? <div><dt>Combined-only history</dt><dd>{exact(item.components.combinedOnly)}</dd></div> : null}</dl> : null}</div>)}</div>{activityTotals.length ? <div className="activity-mini-grid">{activityTotals.map(([label, value]) => <div key={label}><strong>{compact(value)}</strong><span>{label}</span></div>)}</div> : null}</article> : null}
  {profile.dailyTokens.length ? <article className="public-card wide daily-token-ledger"><div className="section-title"><div><p className="eyebrow">Daily token history · up to 365 days</p><h2>Exactly which provider used how much, each day</h2></div><span className="proof-chip">Reconciles to total</span></div><p className="card-intro">Each row comes from the same de-duplicated provider metrics used above. Scroll to inspect every token-bearing day in the covered period.</p><div className="daily-token-table-wrap"><table className="daily-token-table"><thead><tr><th scope="col">Date</th>{profile.tokenBreakdown.map((provider) => <th scope="col" key={provider.source}>{provider.label}</th>)}<th scope="col">Daily total</th></tr></thead><tbody>{profile.dailyTokens.map((day) => <tr key={day.date}><th scope="row"><time dateTime={day.date}>{calendarDate(day.date)}</time></th>{profile.tokenBreakdown.map((provider) => <td key={provider.source}>{exact(day.bySource[provider.source] ?? 0)}</td>)}<td className="daily-total">{exact(day.total)}</td></tr>)}</tbody></table></div></article> : null}
  {profile.activeDays > 0 ? <article className="public-card wide"><div className="section-title"><div><p className="eyebrow">Coding activity · 12 weeks</p><h2>Your building rhythm</h2></div><span className="proof-chip">{profile.verified ? 'Source-labelled' : 'Example data'}</span></div><div className="public-heatmap">{profile.activity.map((day) => <span key={day.date} className={`heat level-${day.value}`} title={`${day.date}: level ${day.value}`}/>)}</div><div className="provider-row" aria-label="All connected coding providers">{profile.providers.map((provider) => <span key={provider}>{provider}</span>)}</div></article> : null}
  {deliveryTotal > 0 ? <article className="public-card"><p className="eyebrow">GitHub delivery · 90 days</p><h2>Shipped work</h2><dl className="delivery-list"><div><dt>Commits</dt><dd>{profile.github.commits}</dd></div><div><dt>Merged PRs</dt><dd>{profile.github.mergedPullRequests}</dd></div><div><dt>Reviews</dt><dd>{profile.github.reviews}</dd></div><div><dt>Releases</dt><dd>{profile.github.releases}</dd></div></dl><p className="fine-print">Correlated by time window. No claim that a specific commit was AI-generated.</p></article> : null}
  {profile.conversation.sessions > 0 ? <article className="public-card conversation-card"><div><p className="eyebrow">Experimental conversation activity</p><h2>Optional and separate</h2><p>{profile.conversation.sessions} deliberately observed or imported sessions across {profile.conversation.activeDays} days.</p></div><span className="excluded-label">Never ranked</span><p className="fine-print">{profile.conversation.coverage}. This does not represent complete provider history.</p></article> : null}
  <details className="profile-proof-details wide" id="build-level"><summary><span><strong>How build level {profile.scoreEligible ? profile.score : '—'} was calculated</strong><small>Scoring formula and source details</small></span><b>Show proof</b></summary><div className="proof-details-grid"><article className="score-ledger"><div className="section-title"><div><p className="eyebrow">Build level breakdown</p><h2>Four signals under the hood</h2></div><span className="proof-chip">Tokens excluded</span></div><div className="score-part-list">{scoreParts.map(([label, value, max]) => <div key={label}><div><span>{label}</span><strong>{value}/{max}</strong></div><span className="score-part-track"><i style={{ width: `${Math.min(100, value / max * 100)}%` }}/></span></div>)}</div><p className="fine-print">Raw token volume never raises the build level. <Link href="/methodology">See the complete formula →</Link></p></article><article><p className="eyebrow">Source details</p><h2>Where every stat came from</h2><div className="provenance-list">{profile.coverage.map((item) => <div key={item.source}><span className={`status-dot ${item.status.toLowerCase()}`}/><span><strong>{item.label}</strong><small>{item.provenance} · {item.completeness}</small>{item.note ? <em>{item.note}</em> : null}</span></div>)}</div></article></div></details></section>
  <ShareBox username={profile.username} updatedAt={profile.updatedAt}/><aside className="disclaimer"><strong>Workflow adoption ≠ developer competence.</strong><span>This profile shows attributable tool use and delivery signals. It is not a measure of code quality, judgment, or employability.</span></aside>
  <section className="profile-conversion"><div><p className="eyebrow">Make yours</p><h2>Meet your AI build alter ego.</h2><p>Connect GitHub, add your coding activity with one command, and put the live card in your README.</p></div><div><Link className="primary-link" href={user ? '/share' : `/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>{user ? 'Open my card' : 'Make my card'} →</Link></div></section>
  <SiteFooter/>
  </main>;
}
