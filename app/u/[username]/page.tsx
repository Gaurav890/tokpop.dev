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
    { icon: '⚡', value: compact(profile.lifetimeTokens), label: 'tokens moved', visible: profile.lifetimeTokens > 0 },
    { icon: '🎮', value: profile.sessions, label: 'recorded sessions', visible: profile.sessions > 0 },
    { icon: '🔥', value: profile.activeDays, label: 'active days', visible: profile.activeDays > 0 },
    { icon: '🏁', value: `${profile.currentStreak}d`, label: 'current streak', visible: profile.currentStreak > 0 },
    { icon: '🧰', value: profile.providers.length, label: 'tool loadout', visible: profile.providers.length > 0 },
  ].filter((item) => item.visible);
  const deliveryTotal = profile.github.commits + profile.github.mergedPullRequests + profile.github.reviews + profile.github.releases;
  const updatedLabel = new Date(profile.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

  return <main className="profile-page">
    <SiteHeader user={user}/>
    <section className="profile-player-hero">
      <span className="profile-hero-sticker" aria-hidden="true">1UP</span>
      <div className="profile-player-copy">
        <div className="profile-player-identity">
          <span className="profile-avatar">{profile.avatarUrl ? <Image src={profile.avatarUrl} width={96} height={96} alt=""/> : profile.name.slice(0, 2).toUpperCase()}</span>
          <div><p className="verified-line">● {profile.verified ? 'GITHUB VERIFIED PLAYER' : 'LABELLED EXAMPLE'}</p><h1>{profile.name}</h1><p>@{profile.username} · Updated {updatedLabel}</p></div>
        </div>
        <div className="profile-alter-ego">
          <span aria-hidden="true">{profile.archetype.emoji}</span>
          <div><small>ALTER EGO UNLOCKED</small><strong>{profile.archetype.title}</strong><p>{profile.archetype.summary}</p></div>
        </div>
        {profile.providers.length ? <div className="profile-loadout"><span>TOOL LOADOUT</span><div>{profile.providers.map((provider) => <b key={provider}>{provider}</b>)}</div></div> : null}
      </div>
      <div className="profile-player-score">
        <span className="profile-live-pill">● LIVE BUILD</span>
        {profile.lifetimeTokens > 0 ? <div className="profile-token-flex"><strong>{compact(profile.lifetimeTokens)}</strong><span>AI CODING TOKENS MOVED</span></div> : <div className="profile-token-flex"><strong>READY</strong><span>FOR THE FIRST SYNC</span></div>}
        <div className="profile-score-duo"><div><span>BUILD LEVEL</span><strong>{profile.scoreEligible ? profile.score : '—'}<small>/100</small></strong></div><div><span>CURRENT STREAK</span><strong>{profile.currentStreak}<small> days</small></strong></div></div>
        <a href="#receipts">See the receipts ↓</a>
      </div>
    </section>

    {headlineStats.length ? <section className={`profile-strip stats-${headlineStats.length}`}>{headlineStats.map((item) => <div key={item.label}><i aria-hidden="true">{item.icon}</i><strong>{item.value}</strong><span>{item.label}</span></div>)}</section> : null}

    <section className="profile-section-intro" id="receipts"><div><p className="eyebrow">THE RECEIPTS</p><h2>Big flex. Exact breakdown.</h2></div><p>The headline is fun; the proof is serious. Every source keeps its own label, every total is inspectable, and raw token volume never buys a higher build level.</p></section>

    <section className="profile-grid">
      {profile.lifetimeTokens > 0 ? <article className="public-card token-ledger profile-feature-card wide">
        <div className="section-title"><div><p className="eyebrow">⚡ TOKEN VAULT · COVERED PERIOD</p><h2>Power by provider</h2></div><strong className="token-total-display">{exact(profile.lifetimeTokens)}</strong></div>
        <p className="card-intro">No mystery mega-number. Each token-reporting tool gets its own lane, percentage, and provenance label.</p>
        <div className="token-source-list">{profile.tokenBreakdown.map((item, index) => <div key={item.source}>
          <span className="provider-rank">0{index + 1}</span><div><strong>{item.label}</strong><span>{item.provenance}</span></div><b>{exact(item.tokens)}<small>{percent(item.tokens, profile.lifetimeTokens)}% of total</small></b>
          <span className="token-bar"><i style={{ width: `${Math.max(4, profile.lifetimeTokens ? item.tokens / profile.lifetimeTokens * 100 : 0)}%` }}/></span>
          {item.components && (item.components.input + item.components.output + item.components.cacheCreation + item.components.cacheRead > 0) ? <dl className="token-components"><div><dt>Base input</dt><dd>{exact(item.components.input)}</dd></div><div><dt>Output</dt><dd>{exact(item.components.output)}</dd></div><div><dt>Cache write</dt><dd>{exact(item.components.cacheCreation)}</dd></div><div><dt>Cache read</dt><dd>{exact(item.components.cacheRead)}</dd></div>{item.components.combinedOnly > 0 ? <div><dt>Combined-only history</dt><dd>{exact(item.components.combinedOnly)}</dd></div> : null}</dl> : null}
        </div>)}</div>
        {activityTotals.length ? <div className="activity-mini-grid">{activityTotals.map(([label, value]) => <div key={label}><strong>{compact(value)}</strong><span>{label}</span></div>)}</div> : null}
      </article> : null}

      {profile.activeDays > 0 ? <article className="public-card wide rhythm-card"><div className="section-title"><div><p className="eyebrow">🔥 12-WEEK BUILD STREAK</p><h2>Momentum, in pixels</h2></div><span className="proof-chip">{profile.verified ? 'Source-labelled' : 'Example data'}</span></div><div className="public-heatmap">{profile.activity.map((day) => <span key={day.date} className={`heat level-${day.value}`} title={`${day.date}: level ${day.value}`}/>)}</div><div className="provider-row" aria-label="All connected coding providers">{profile.providers.map((provider) => <span key={provider}>{provider}</span>)}</div></article> : null}

      {deliveryTotal > 0 ? <article className="public-card shipping-card"><p className="eyebrow">🚀 GITHUB · 90 DAYS</p><h2>Shipping receipts</h2><dl className="delivery-list"><div><dt>Commits</dt><dd>{profile.github.commits}</dd></div><div><dt>Merged PRs</dt><dd>{profile.github.mergedPullRequests}</dd></div><div><dt>Reviews</dt><dd>{profile.github.reviews}</dd></div><div><dt>Releases</dt><dd>{profile.github.releases}</dd></div></dl><p className="fine-print">Correlated by time window. No claim that a specific commit was AI-generated.</p></article> : null}

      {profile.conversation.sessions > 0 ? <article className="public-card conversation-card"><div><p className="eyebrow">💬 SIDE QUEST</p><h2>Conversation activity</h2><p>{profile.conversation.sessions} deliberately observed or imported sessions across {profile.conversation.activeDays} days.</p></div><span className="excluded-label">Never ranked</span><p className="fine-print">{profile.conversation.coverage}. This does not represent complete provider history.</p></article> : null}

      {profile.dailyTokens.length ? <details className="public-card wide daily-token-details"><summary><span><b>🔎</b><span><strong>Open the day-by-day token receipts</strong><small>{profile.dailyTokens.length} token-bearing days · every provider kept separate</small></span></span><em><span>EXPAND ↓</span><span>CLOSE ↑</span></em></summary><div className="daily-token-body"><p className="card-intro">Each row comes from the same de-duplicated provider metrics used in the token vault and reconciles to the headline total.</p><div className="daily-token-table-wrap"><table className="daily-token-table"><thead><tr><th scope="col">Date</th>{profile.tokenBreakdown.map((provider) => <th scope="col" key={provider.source}>{provider.label}</th>)}<th scope="col">Daily total</th></tr></thead><tbody>{profile.dailyTokens.map((day) => <tr key={day.date}><th scope="row"><time dateTime={day.date}>{calendarDate(day.date)}</time></th>{profile.tokenBreakdown.map((provider) => <td key={provider.source}>{exact(day.bySource[provider.source] ?? 0)}</td>)}<td className="daily-total">{exact(day.total)}</td></tr>)}</tbody></table></div></div></details> : null}

      <details className="profile-proof-details wide" id="build-level"><summary><span><strong>🧪 Open the build-level recipe</strong><small>Scoring formula and source details</small></span><b>SHOW THE MATH ↓</b></summary><div className="proof-details-grid"><article className="score-ledger"><div className="section-title"><div><p className="eyebrow">BUILD LEVEL BREAKDOWN</p><h2>Four signals under the hood</h2></div><span className="proof-chip">Tokens excluded</span></div><div className="score-part-list">{scoreParts.map(([label, value, max]) => <div key={label}><div><span>{label}</span><strong>{value}/{max}</strong></div><span className="score-part-track"><i style={{ width: `${Math.min(100, value / max * 100)}%` }}/></span></div>)}</div><p className="fine-print">Raw token volume never raises the build level. <Link href="/methodology">See the complete formula →</Link></p></article><article><p className="eyebrow">SOURCE DETAILS</p><h2>Where every stat came from</h2><div className="provenance-list">{profile.coverage.map((item) => <div key={item.source}><span className={`status-dot ${item.status.toLowerCase()}`}/><span><strong>{item.label}</strong><small>{item.provenance} · {item.completeness}</small>{item.note ? <em>{item.note}</em> : null}</span></div>)}</div></article></div></details>
    </section>

    <ShareBox username={profile.username} updatedAt={profile.updatedAt}/>
    <aside className="disclaimer"><strong>Workflow adoption ≠ developer competence.</strong><span>This profile shows attributable tool use and delivery signals. It is not a measure of code quality, judgment, or employability.</span></aside>
    <section className="profile-conversion"><div><p className="eyebrow">YOUR TURN</p><h2>Unlock your build alter ego.</h2><p>Connect GitHub, add coding activity with one command, and drop the live flex card into your README.</p></div><div><Link className="primary-link" href={user ? '/share' : `/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>{user ? 'Open my card' : 'Make my card'} →</Link></div></section>
    <SiteFooter/>
  </main>;
}
