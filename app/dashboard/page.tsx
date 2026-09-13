import { currentGitHubUser } from '../../lib/auth';
import { getPrivateProfile } from '../../lib/profile';
import { DashboardDemo } from '../page';
import { SiteHeader } from '../ui/site-header';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export default async function DashboardPage() {
  const user = await currentGitHubUser();
  if (user) {
    const profile = await getPrivateProfile(user.userId);
    if (profile) return <DashboardDemo profile={profile}/>;
    return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Private cloud dashboard</p><h1>Your profile is ready for its first source.</h1><p>No activity has been attached to this GitHub identity yet. Open Connections to pair a local collector or add optional conversation activity.</p><Link className="primary-link dashboard-signin" href="/connections">Open Connections</Link></section></main>;
  }
  return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Private cloud dashboard</p><h1>Your AI work. One evidence trail.</h1><p>See coding activity, shipped GitHub work, and optional conversation activity—then choose exactly what becomes public.</p><Link className="primary-link dashboard-signin" href="/api/auth/github/start?return_to=/dashboard">Continue with GitHub</Link></section><section className="field-boundary"><div><p className="eyebrow">Coding activity</p><h2>Eligible evidence</h2><p>Codex, Claude Code, Cursor, Gemini CLI, GitHub Copilot CLI, and GitHub delivery—with coverage and provenance.</p></div><div><p className="eyebrow">Conversation activity</p><h2>Separate by design</h2><p>ChatGPT and Claude web activity appears only through explicit MCP events or locally parsed official exports.</p></div></section></main>;
}
