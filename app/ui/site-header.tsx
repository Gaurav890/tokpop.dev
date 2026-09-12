import type { GitHubSession } from '../../lib/auth';
import Link from 'next/link';

export function SiteHeader({ user }: { user?: GitHubSession | null }) {
  return <header className="site-header">
    <Link className="brand dark-brand" href="/"><span className="brand-mark">A/</span><span>AI Native Profile</span></Link>
    <nav><Link href="/u/demo">Example</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/methodology">Methodology</Link><Link href="/integrations/mcp">Integrations</Link></nav>
    {user ? <Link className="header-user" href="/dashboard"><span>{user.login}</span><small>Dashboard →</small></Link> : <Link className="primary-link compact-link" href="/api/auth/github/start">Sign in with GitHub</Link>}
  </header>;
}
