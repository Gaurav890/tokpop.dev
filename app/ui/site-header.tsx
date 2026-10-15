import type { GitHubSession } from '../../lib/auth';
import Link from './native-link';

export function SiteHeader({ user }: { user?: GitHubSession | null }) {
  return <header className="site-header">
    <Link className="brand dark-brand" href="/"><span className="brand-mark">tokpop.dev</span></Link>
    <nav aria-label="Primary navigation">{user ? <Link href="/share">My card</Link> : null}<Link href="/leaderboard">Leaderboard</Link></nav>
    {user ? <details className="account-menu">
      <summary aria-label={`Open account menu for ${user.login}`}><span className="account-avatar">{user.login.slice(0, 2).toUpperCase()}</span><span><strong>@{user.login}</strong><small>Account</small></span><b aria-hidden="true">⌄</b></summary>
      <div>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/connections">Data sources</Link>
        <Link href="/settings/privacy">Privacy & visibility</Link>
        <Link href="/settings/devices">Devices</Link>
        <a href="https://github.com/Gaurav890/ai-native-profile" target="_blank" rel="noreferrer">Open-source repo ↗</a>
      </div>
    </details> : <Link className="primary-link compact-link" href={`/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>Make my card</Link>}
  </header>;
}
