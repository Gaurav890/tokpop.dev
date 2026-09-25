import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { SiteFooter } from '../ui/site-footer';
import { ConnectForm } from './connect-form';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '', onboarding } = await searchParams;
  const isOnboarding = onboarding === '1';

  return <main className="marketing-page connect-page">
    <SiteHeader user={user}/>
    <section className="narrow-hero connect-hero">
      <p className="eyebrow">{code ? 'Secure power-up' : isOnboarding ? 'Your card starts with GitHub' : 'Local coding activity'}</p>
      <h1>{code ? 'Approve this power-up.' : user ? 'Load your tools from the card.' : 'Claim your card first.'}</h1>
      <p>{code ? 'This one-time code pairs the collector running on your computer. Approval never grants access to prompts, code, repositories, commands, or credentials.' : user ? 'Your card creates a single-use command that discovers all supported coding tools together and refreshes automatically after the first sync.' : 'Sign in with GitHub to create your private card, then connect every supported coding tool with one command.'}</p>
      {isOnboarding && !user ? <Link className="primary-link dashboard-signin" href={`/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>Make my card →</Link> : null}
    </section>

    {code ? <section className="focused-approval">
      <article className="approval-card"><span>ONE-TIME PAIRING CODE</span>{user ? <ConnectForm initialCode={code}/> : <><h2>GitHub identity required</h2><p>Sign in to attach this computer to the correct private profile.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article>
    </section> : user ? <section className="connect-return-card"><div><p className="eyebrow">One command · all supported tools</p><h2>Start from your live card.</h2><p>The card page generates a short-lived command, copies it, and watches for the first successful sync.</p></div><Link className="primary-link" href="/share?onboarding=1">Open my card →</Link></section> : null}

    <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, coverage, and provenance.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, tokens, and environment variables.</p></div></section>
    <SiteFooter/>
  </main>;
}
