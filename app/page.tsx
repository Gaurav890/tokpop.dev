import Link from 'next/link';
import { demoProfile, type PublicProfile } from '../lib/demo-profile';

export function DashboardDemo({ profile = demoProfile }: { profile?: PublicProfile }) {
  const displaySources = profile.coverage.filter((item) => !['chatgpt_web', 'claude_web', 'github'].includes(item.source)).slice(0, 4).map((item, index) => ({ mark: item.label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(), name: item.label, detail: item.provenance, state: item.status, tone: ['lime', 'orange', 'blue', 'violet'][index] }));
  const breakdown = [['Consistency', profile.scoreBreakdown.consistency, 30], ['Workflow depth', profile.scoreBreakdown.workflowDepth, 25], ['Provider breadth', profile.scoreBreakdown.providerBreadth, 15], ['Delivery', profile.scoreBreakdown.delivery, 30]] as const;
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="AI Native Profile home">
          <span className="brand-mark">A/</span>
          <span>AI Native</span>
        </a>

        <nav className="nav" aria-label="Primary navigation">
          <Link className="nav-link active" href="/dashboard"><span>⌁</span>Overview</Link>
          <a className="nav-link" href="#activity"><span>⌗</span>Activity</a>
          <Link className="nav-link" href="/connect"><span>↗</span>Sources</Link>
          <Link className="nav-link" href="/u/demo"><span>◎</span>Public profile</Link>
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
            <p className="eyebrow">Your private workspace</p>
            <h1>Good morning, {profile.name.split(' ')[0]}.</h1>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">◌</button>
            <Link className="secondary-button button-link" href={profile.publicEnabled ? `/u/${profile.username}` : '/settings/privacy'}>{profile.publicEnabled ? 'View public profile' : 'Enable public profile'} <span>↗</span></Link>
            <Link className="primary-button button-link" href={profile.publicEnabled ? `/u/${profile.username}#share` : '/settings/privacy'}>Share your stats</Link>
          </div>
        </header>

        <div className="content" id="overview">
          <section className="score-panel">
            <div className="score-copy">
              <div className="section-kicker"><span className="live-dot" />AI WORKFLOW INDEX</div>
              <div className="score-line"><strong>{profile.scoreEligible ? profile.score : '—'}</strong><span>/100</span>{profile.scoreEligible && <em>rank eligible</em>}</div>
              <p>{profile.scoreEligible ? 'A balanced signal of consistency, workflow depth, provider breadth, and shipped work.' : profile.scoreReason ?? 'Insufficient coverage for a ranked score.'}</p>
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
            <article><span className="stat-icon">◫</span><p>Lifetime tokens</p><strong>{new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 }).format(profile.lifetimeTokens)}</strong><small><b>Provenance</b> official wins on overlap</small></article>
            <article><span className="stat-icon">↯</span><p>Coding sessions</p><strong>{profile.sessions}</strong><small>Across {profile.providers.length} sources</small></article>
            <article><span className="stat-icon">⌁</span><p>Current streak</p><strong>{profile.currentStreak} <em>days</em></strong><small>Longest: {profile.longestStreak} days</small></article>
            <article><span className="stat-icon">✓</span><p>Delivery points</p><strong>{profile.deliveryPoints}</strong><small>Last 90 days</small></article>
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
              <div className="card-head compact"><div><p className="eyebrow">Source coverage</p><h2>{displaySources.length} of 5 connected</h2></div><Link href="/connect">Manage</Link></div>
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

export default function Home() { return <DashboardDemo/>; }
