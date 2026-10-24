import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { SiteFooter } from '../ui/site-footer';
import { ConnectForm } from './connect-form';
import { redirect } from 'next/navigation';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '', onboarding } = await searchParams;
  const isOnboarding = onboarding === '1';
  if (!code && user) redirect('/share?connect=1#power-up');

  return <main className="marketing-page connect-page">
    <SiteHeader user={user}/>
    <section className="connection-setup-hero">
      <p className="eyebrow">{code ? 'Secure power-up' : isOnboarding ? 'Your card starts with GitHub' : 'Local coding activity'}</p>
      <h1>{code ? 'Connect this computer.' : 'Connect your coding tools.'}</h1>
      <p>{code ? 'Approve this one-time code to link your computer to your profile. The collector uploads only aggregate stats after your approval in Terminal.' : 'Sign in with your own GitHub account, then run one command on the computer where you use your coding tools.'}</p>
      {!code && !user ? <Link className="primary-link dashboard-signin" href={`/api/auth/github/start?return_to=${encodeURIComponent('/connect')}`}>Continue with GitHub →</Link> : null}
    </section>

    {code ? <section className="focused-approval">
      <article className="approval-card"><span>ONE-TIME PAIRING CODE</span>{user ? <ConnectForm initialCode={code} accountLogin={user.login}/> : <><h2>Sign in to connect this computer</h2><p>Sign in to attach this computer to the correct private profile.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article>
    </section> : null}

    <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, history coverage, and collection method.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, access tokens, and environment variables.</p></div></section>
    <SiteFooter/>
  </main>;
}
