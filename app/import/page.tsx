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
  return <main className="marketing-page import-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">{isOnboarding ? 'Power-up · add a conversation source' : 'Private browser import'}</p><h1>Bring the history. Leave the conversations.</h1><p>Your archive opens only in this browser. Prompts, responses, files, titles, and the ZIP stay on this device; only the approved daily counts and coverage dates leave.</p></section>{user ? <ImportPanel initialSource={initialSource} onboarding={isOnboarding}/> : <section className="callout"><p className="eyebrow">One quick checkpoint</p><h2>Sign in before importing</h2><p>Sign in with GitHub so these counts go to your private profile.</p><Link className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with GitHub →</Link></section>}<section className="plain-section"><p className="eyebrow">🛡️ Fair-play rule</p><h2>Imported history never raises your rank.</h2><p>Official exports appear under Conversation Activity, labelled as an official export. They stay outside build levels and leaderboards because user-supplied archives are not tamper-proof.</p></section></main>;
}
