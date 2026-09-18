import type { GitHubSession } from '../../lib/auth';
import Link from './native-link';

export function SiteHeader({ user }: { user?: GitHubSession | null }) {
  return <header className="site-header">
    <Link className="brand dark-brand" href="/"><span className="brand-mark">anp/</span><span>AI Native Profile</span></Link>
    <nav><Link href="/u/demo">Example</Link><Link href="/connections">Connections</Link>{user && <Link href="/share">Share</Link>}<Link href="/leaderboard">Leaderboard</Link><Link href="/methodology">Methodology</Link><a href="https://github.com/Gaurav890/ai-native-profile" target="_blank" rel="noreferrer">GitHub ↗</a></nav>
    {user ? <Link className="header-user" href="/dashboard"><span>{user.login}</span><small>Dashboard →</small></Link> : <Link className="primary-link compact-link" href={`/api/auth/github/start?return_to=${encodeURIComponent('/connect?onboarding=1')}`}>Sign in with GitHub</Link>}
  </header>;
}
