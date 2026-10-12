import Link from './ui/native-link';
import Image from 'next/image';
import type { PublicProfile } from '../lib/demo-profile';
import { currentGitHubUser } from '../lib/auth';
import { SiteHeader } from './ui/site-header';
import { SiteFooter } from './ui/site-footer';

const supportedSources = [
  { id: 'codex', label: 'Codex' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'gemini', label: 'Gemini CLI' },
  { id: 'copilot', label: 'Copilot CLI' },
  { id: 'github', label: 'GitHub' },
] as const;

function SourceLogo({ source }: { source: typeof supportedSources[number]['id'] }) {
  if (source === 'codex') return <svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2.25"><ellipse cx="16" cy="9.5" rx="5.5" ry="8"/><ellipse cx="16" cy="22.5" rx="5.5" ry="8"/><ellipse cx="10.4" cy="12.8" rx="5.5" ry="8" transform="rotate(-60 10.4 12.8)"/><ellipse cx="21.6" cy="19.2" rx="5.5" ry="8" transform="rotate(-60 21.6 19.2)"/><ellipse cx="21.6" cy="12.8" rx="5.5" ry="8" transform="rotate(60 21.6 12.8)"/><ellipse cx="10.4" cy="19.2" rx="5.5" ry="8" transform="rotate(60 10.4 19.2)"/></g></svg>;
  if (source === 'claude') return <svg viewBox="0 0 32 32" aria-hidden="true"><g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.7"><path d="M16 3v26M3 16h26M6.8 6.8l18.4 18.4M25.2 6.8L6.8 25.2"/><path d="M10.6 3.9l10.8 24.2M28.1 10.6L3.9 21.4M21.4 3.9L10.6 28.1M28.1 21.4L3.9 10.6"/></g></svg>;
  if (source === 'cursor') return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M5 3.5 27 16 16 18.7 10.2 29z"/><path fill="none" stroke="white" strokeLinejoin="round" strokeWidth="2" d="m8.5 7 14.7 8.4-8.6 2.1-4.4 7.7z"/></svg>;
  if (source === 'gemini') return <svg viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="gemini-gradient" x1="4" y1="28" x2="28" y2="4"><stop stopColor="#3676f8"/><stop offset=".52" stopColor="#8a69ee"/><stop offset="1" stopColor="#ed70a8"/></linearGradient></defs><path fill="url(#gemini-gradient)" d="M16 2c.9 7.8 6.2 13.1 14 14-7.8.9-13.1 6.2-14 14C15.1 22.2 9.8 16.9 2 16c7.8-.9 13.1-6.2 14-14Z"/></svg>;
  if (source === 'copilot') return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M8.2 8.7 5 5.3l1.8-1.8 4 3.1A15 15 0 0 1 16 5.7c1.9 0 3.7.3 5.2.9l4-3.1L27 5.3l-3.2 3.4c2 1.7 3.2 4 3.2 6.7v5.1c0 4.5-4.9 8.1-11 8.1s-11-3.6-11-8.1v-5.1c0-2.7 1.2-5 3.2-6.7Z"/><path fill="#fff" d="M8.2 15.2c0-3 3.5-5.3 7.8-5.3s7.8 2.3 7.8 5.3v4.6c0 3-3.5 5.3-7.8 5.3s-7.8-2.3-7.8-5.3v-4.6Z"/><circle cx="12.7" cy="17" r="1.7"/><circle cx="19.3" cy="17" r="1.7"/><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" d="M12.3 21c2.5 1.5 4.9 1.5 7.4 0"/></svg>;
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" fillRule="evenodd" d="M16 3.2A12.8 12.8 0 0 0 12 28c.6.1.8-.3.8-.6v-2.5c-3.4.7-4.1-1.4-4.1-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.4-5.5-6.1 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.5 1.3a12 12 0 0 1 6.4 0c2.4-1.6 3.5-1.3 3.5-1.3.6 1.7.2 3 .1 3.3.8.9 1.2 2 1.2 3.3 0 4.8-2.9 5.8-5.6 6.1.4.4.8 1.1.8 2.2v3.9c0 .4.2.7.8.6A12.8 12.8 0 0 0 16 3.2Z" clipRule="evenodd"/></svg>;
}

export function DashboardDemo({ profile }: { profile: PublicProfile }) {
  const displaySources = profile.coverage.filter((item) => !['chatgpt_web', 'claude_web', 'github'].includes(item.source)).slice(0, 5).map((item, index) => ({ mark: item.label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase(), name: item.label, detail: item.provenance, state: item.status, tone: ['lime', 'orange', 'blue', 'violet'][index % 4] }));
  const breakdown = [['Consistency', profile.scoreBreakdown.consistency, 30], ['Workflow depth', profile.scoreBreakdown.workflowDepth, 25], ['Provider breadth', profile.scoreBreakdown.providerBreadth, 15], ['Delivery', profile.scoreBreakdown.delivery, 30]] as const;
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="tokpop.dev home">
          <span className="brand-mark">tokpop.dev</span>
          <span>tokpop.dev</span>
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
    <section className="home-stage">
      <div className="home-stage-copy">
        <p className="eyebrow">Track. Share. Flex.</p>
        <h1>Your AI activity.<br/><span>With personality.</span></h1>
        <p>Your tools, tokens, and daily streaks—in one place. Track your AI workflow, then turn it into a live card worth showing off.</p>
      </div>
      <aside className="home-alter-ego" aria-label="Example build alter ego">
        <span>UNLOCKED ●</span>
        <strong>🥷 Token Ninja</strong>
        <small>2.5B tokens · 3 tools · 41-day streak</small>
      </aside>

      <div className="home-card-drop">
        <div className="home-card-head"><span>LIVE DEMO · CLICK TO MAKE YOURS</span><b>FLEX MODE ON ⚡</b></div>
        <Link href={cardHref} aria-label="Make your own live AI build card">
          <Image src="/api/v1/cards/demo?theme=dark" width={640} height={252} unoptimized priority alt="Example live AI build card"/>
        </Link>
        <p>Paste it once. Your stats keep moving. Every click can bring the next builder in.</p>
      </div>

      <aside className="home-conversion-card">
        <p className="eyebrow">Start free</p>
        <h2>Your flex card in 30 seconds.</h2>
        <p className="home-conversion-intro">See your starter card immediately. Add stronger proof only when you want it.</p>
        <Link className="home-conversion-button" href={cardHref}>{user ? 'Open my card' : 'Make my card'} <span>→</span></Link>
        <div className="home-conversion-trust"><span>🔒 Private until published</span><span>🧼 No prompts or code</span></div>
        <ol>
          <li><span>01</span><div><strong>Claim it with GitHub</strong><small>Your private starter card appears instantly.</small></div></li>
          <li><span>02</span><div><strong>Power up your stats</strong><small>One command finds supported coding tools.</small></div></li>
          <li><span>03</span><div><strong>Copy. Paste. Flex.</strong><small>Your live README card updates automatically.</small></div></li>
        </ol>
      </aside>
    </section>
    <section className="supported-strip" aria-label="Supported coding sources">
      <span>WORKS WITH</span>
      <ul>{supportedSources.map((source) => <li key={source.id} className={`source-logo source-logo-${source.id}`}><span className="source-logo-mark"><SourceLogo source={source.id}/></span><strong>{source.label}</strong></li>)}</ul>
    </section>
    <section className="home-flex-reasons">
      <div className="home-flex-heading"><p className="eyebrow">More than a badge</p><h2>Show the build. Show the receipts. Keep it fun.</h2></div>
      <div className="home-flex-grid">
        <article><span>🔥</span><small>THE FLEX</small><h3>A live card worth putting in your README.</h3><p>Your alter ego, tools, tokens, streak, and level in one collectible drop.</p></article>
        <article><span>🔎</span><small>THE RECEIPTS</small><h3>Every provider and every day, clearly broken down.</h3><p>No mystery total: inspect exactly which tool contributed what.</p></article>
        <article><span>🏆</span><small>THE GAME</small><h3>Climb through consistency—not token spending.</h3><p>Join the leaderboard when you are ready. Raw token volume never raises your level.</p></article>
      </div>
    </section>
    <section className="home-final-conversion">
      <div><span aria-hidden="true">⚡</span><p className="eyebrow">Ready player one</p><h2>What&apos;s your build alter ego?</h2></div>
      <Link className="home-conversion-button" href={cardHref}>{user ? 'Go to my card' : 'Reveal my card'} <span>→</span></Link>
    </section>
    <SiteFooter/>
  </main>;
}
