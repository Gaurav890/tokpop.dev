import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { ImportPanel } from './import-panel';

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ source?: string; onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { source, onboarding } = await searchParams;
  const initialSource = source === 'claude' ? 'claude_web' : 'chatgpt_web';
  const isOnboarding = onboarding === '1';
  const returnTo = `/import?source=${source === 'claude' ? 'claude' : 'chatgpt'}${isOnboarding ? '&onboarding=1' : ''}`;
  return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">{isOnboarding ? 'Onboarding · add an AI source' : 'Browser-based history import'}</p><h1>Bring conversation history without uploading conversations.</h1><p>The archive is opened in your browser. Prompts, responses, files, titles, and the ZIP stay on this device; only approved daily counts and coverage dates are sent.</p></section>{user ? <ImportPanel initialSource={initialSource} onboarding={isOnboarding}/> : <section className="callout"><h2>Sign in before importing</h2><p>Your aggregate history needs a verified profile destination.</p><Link className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with GitHub</Link></section>}<section className="plain-section"><h2>Ranking boundary</h2><p>Official exports appear under Conversation Activity with <code>official_export</code> provenance. They never affect the AI Workflow Index or leaderboards because user-supplied archives are not tamper-proof.</p></section></main>;
}
