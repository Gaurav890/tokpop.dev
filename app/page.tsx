import Link from './ui/native-link';
import type { PublicProfile } from '../lib/demo-profile';
import { currentGitHubUser } from '../lib/auth';
import { SiteHeader } from './ui/site-header';
import { SiteFooter } from './ui/site-footer';

export function DashboardDemo({ profile }: { profile: PublicProfile }) {
  const displaySources = profile.coverage.filter((item) => !['chatgpt_web', 'claude_web', 'github'].includes(item.source)).slice(0, 5).map((item, index) => ({ mark: item.label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(), name: item.label, detail: item.provenance, state: item.status, tone: ['lime', 'orange', 'blue', 'violet'][index % 4] }));
  const breakdown = [['Consistency', profile.scoreBreakdown.consistency, 30], ['Workflow depth', profile.scoreBreakdown.workflowDepth, 25], ['Provider breadth', profile.scoreBreakdown.providerBreadth, 15], ['Delivery', profile.scoreBreakdown.delivery, 30]] as const;
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="AI Native Profile home">
          <span className="brand-mark">anp/</span>
          <span>AI Native Profile</span>
        </a>

        <nav className="nav" aria-label="Primary navigation">
          <Link className="nav-link active" href="/dashboard"><span>⌁</span>Overview</Link>
          <a className="nav-link" href="#activity"><span>⌗</span>Activity</a>
          <Link className="nav-link" href="/connections"><span>↗</span>Sources</Link>
          <Link className="nav-link" href={profile.publicEnabled ? `/u/${profile.username}` : '/settings/privacy'}><span>◎</span>Public profile</Link>
          <Link className="nav-link" href="/leaderboard"><span>♜</span>Leaderboard</Link>
        </nav>

        <div className="sidebar-foot">
          <div className="privacy-pill"><span className="pulse" />Private by default</div>
          <Link className="profile-chip" href="/settings/privacy">
            <span className="avatar">GH</span>
            <span><strong>{profile.username}</strong><small>GitHub verified</small></span>
            <span className="chevron">›</span>
          </Link>
        </div>
      </aside>

      <section className="workspace" id="top">
        <header className="topbar">
          <div>
            <p className="eyebrow">Private dashboard · @{profile.username}</p>
            <h1>Your evidence, at a glance.</h1>
          </div>
          <div className="top-actions">
            <Link className="secondary-button button-link" href="/share">{profile.publicEnabled ? 'Share profile' : 'Publish profile'} <span>↗</span></Link>
            <Link className="primary-button button-link" href="/connections">Manage sources</Link>
          </div>
        </header>

        <div className="content" id="overview">
          <section className="score-panel">
            <div className="score-copy">
              <div className="section-kicker"><span className="live-dot" />AI WORKFLOW INDEX · COVERAGE WEIGHTED</div>
              <div className="score-line"><strong>{profile.scoreEligible ? profile.score : '—'}</strong><span>/100</span>{profile.scoreEligible && <em>rank eligible</em>}</div>
              <p>{profile.scoreEligible ? 'Consistency, workflow depth, provider breadth, and shipped work—without rewarding raw token volume.' : profile.scoreReason ?? 'Insufficient coverage for a ranked score.'}</p>
              <Link href="/methodology">How your score works <span>→</span></Link>
            </div>
            <div className="score-breakdown" aria-label="Score breakdown">
              {breakdown.map(([label, value, max]) => (
                <div className="score-row" key={String(label)}>
                  <div><span>{label}</span><b>{value}<small>/{max}</small></b></div>
                  <div className="meter"><i style={{ width: `${(Number(value) / Number(max)) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="stat-grid" aria-label="Coding activity summary">
            <article><span className="stat-icon">01</span><p>Active coding days</p><strong>{profile.activeDays}</strong><small><b>Coverage</b> eligible sources only</small></article>
            <article><span className="stat-icon">02</span><p>Coding sessions</p><strong>{profile.sessions}</strong><small>Across {profile.providers.length} sources</small></article>
            <article><span className="stat-icon">03</span><p>Current streak</p><strong>{profile.currentStreak} <em>days</em></strong><small>Longest: {profile.longestStreak} days</small></article>
            <article><span className="stat-icon">04</span><p>Delivery points</p><strong>{profile.deliveryPoints}</strong><small>GitHub · last 90 days</small></article>
          </section>

          <section className="dashboard-grid">
            <article className="card activity-card" id="activity">
              <div className="card-head">
                <div><p className="eyebrow">Coding activity</p><h2>Momentum, not volume</h2></div>
                <div className="segmented" aria-label="Activity range"><button className="selected">12 weeks</button><button>6 months</button><button>Year</button></div>
              </div>
              <div className="heatmap-wrap">
                <div className="weekday-labels"><span>Mon</span><span>Wed</span><span>Fri</span></div>
                <div className="heatmap" aria-label="Twelve week activity heatmap">
                  {profile.activity.map((day) => <span key={day.date} className={`heat level-${day.value}`} title={`${day.date}: level ${day.value}`} />)}
                </div>
              </div>
              <div className="heatmap-foot">
                <span>Jun 17</span><span>Jul 1</span><span>Jul 15</span><span>Jul 29</span><span>Aug 12</span><span>Aug 26</span><span>Sep 9</span>
              </div>
              <div className="activity-summary">
                <div><strong>{profile.activeDays}</strong><span>active days</span></div>
                <div><strong>{Math.round(profile.scoreBreakdown.workflowDepth / 25 * 100)}%</strong><span>workflow depth</span></div>
                <div><strong>{profile.providers.length}</strong><span>active providers</span></div>
              </div>
            </article>

            <aside className="card sources-card" id="sources">
              <div className="card-head compact"><div><p className="eyebrow">Source coverage</p><h2>{displaySources.length} of 5 connected</h2></div><Link href="/connections">Manage</Link></div>
              <div className="source-list">
                {displaySources.map((source) => (
                  <div className="source-row" key={source.name}>
                    <span className={`source-mark ${source.tone}`}>{source.mark}</span>
                    <span className="source-name"><strong>{source.name}</strong><small>{source.detail}</small></span>
                    <span className={source.state === 'Live' ? 'source-live' : 'source-connect'}>{source.state}</span>
                  </div>
                ))}
              </div>
              <div className="coverage-note"><span>i</span><p><strong>Coverage is part of the proof.</strong> Rankings only use eligible coding sources with at least 30 covered days.</p></div>
            </aside>
          </section>
        </div>
      </section>
    </main>
  );
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await currentGitHubUser();
  const cardHref = user ? '/share?onboarding=1' : `/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`;
  return <main className="marketing-page home-page">
    <SiteHeader user={user}/>
    <section className="proof-hero">
      <div className="proof-copy">
        <div className="release-line"><span>OPEN SOURCE</span><code>anp.activity.v1</code></div>
        <p className="eyebrow">Your AI coding alter ego</p>
        <h1>Your AI build story.<br/><span>One live card.</span></h1>
        <p className="proof-intro">Turn the tools, tokens, streaks, and shipping behind your work into a card worth putting in your GitHub README.</p>
        <div className="home-actions">
          <Link className="primary-link" href={cardHref}>{user ? 'Open my card' : 'Make my card'} <span>→</span></Link>
        </div>
        <div className="proof-promises"><span>GitHub card in 30 seconds</span><span>No prompts or source code</span><span>Private until you publish</span></div>
      </div>
      <aside className="proof-sample" aria-label="Labelled example profile summary">
        <div className="sample-top"><span>AI BUILD CARD</span><b>LIVE ●</b></div>
        <div className="sample-identity"><div><strong>@demo</strong><small>🥷 Token Ninja</small></div><span><b>2.5B</b><small>tokens</small></span></div>
        <div className="sample-stats"><div><strong>78</strong><span>build level</span></div><div><strong>41d</strong><span>streak</span></div><div><strong>3</strong><span>tools</span></div></div>
        <div className="sample-activity" aria-hidden="true">{[0,2,1,3,0,1,4,2,2,0,3,4,1,2,4,3,0,2,1,4,3,2,4,4,1,3,2,4].map((level, index) => <i key={index} className={`sample-level-${level}`}/>)}</div>
        <div className="sample-sources"><span>Codex <strong>2.1B</strong><b>official</b></span><span>Claude Code <strong>380M</strong><b>local exact</b></span><span>Cursor <strong>activity</strong><b>derived</b></span></div>
        <div className="sample-foot"><span>Live stats · source-labelled</span><Link href={cardHref}>Make yours ↗</Link></div>
      </aside>
    </section>
    <section className="supported-strip" aria-label="Supported coding sources"><span>WORKS WITH</span><div>{['Codex','Claude Code','Cursor','Gemini CLI','Copilot CLI','GitHub'].map((source) => <b key={source}>{source}</b>)}</div></section>
    <section className="home-outcomes">
      <div className="value-heading"><p className="eyebrow">One profile · three wins</p><h2>Make the work behind your work visible.</h2></div>
      <div className="outcome-grid">
        <article><span>01</span><strong>README card</strong><h3>A live card people actually want to display.</h3><p>Your build alter ego, tokens, streak, tools, and level—updated automatically.</p></article>
        <article><span>02</span><strong>Exact breakdown</strong><h3>Every provider. Every day. No mystery totals.</h3><p>See how much came from each tool and inspect the daily token ledger behind it.</p></article>
        <article><span>03</span><strong>Community rank</strong><h3>Compete on consistency and shipping—not spending.</h3><p>Opt into a leaderboard where raw token volume never increases your score.</p></article>
      </div>
    </section>
    <section className="setup-rail">
      <div><p className="eyebrow">One guided flow</p><h2>Connect it. Reveal it. Share it.</h2><p>Start with GitHub, then one command connects every supported coding tool together.</p></div>
      <ol><li><span>1</span>Connect GitHub</li><li><span>2</span>Connect AI tools</li><li><span>3</span>Add the card to your README</li></ol>
      <Link className="primary-link" href={cardHref}>{user ? 'Open my card' : 'Make my card'} →</Link>
    </section>
    <section className="community-loop">
      <div><p className="eyebrow">Built to travel</p><h2>Your card brings the next builder in.</h2><p>Every shared card links back to a detailed profile and a simple “Make yours” path. Public profiles can then opt into the community leaderboard.</p></div>
      <Link className="secondary-link" href="/leaderboard">Explore the leaderboard →</Link>
    </section>
    <SiteFooter/>
  </main>;
}
