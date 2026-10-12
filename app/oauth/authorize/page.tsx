import { currentGitHubUser } from '../../../lib/auth';
import { verifyClient } from '../../../lib/oauth';
import { ConsentActions } from './consent-actions';

export const dynamic = 'force-dynamic';

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const value = (key: string) => typeof query[key] === 'string' ? query[key] : '';
  const clientId = value('client_id');
  const redirectUri = value('redirect_uri');
  const state = value('state');
  const codeChallenge = value('code_challenge');
  const scope = value('scope') || 'profile:read activity:write stories:write';
  const valid = value('response_type') === 'code' && value('code_challenge_method') === 'S256' && codeChallenge && await verifyClient(clientId, redirectUri);
  const user = await currentGitHubUser();
  const returnTo = `/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', state, code_challenge: codeChallenge, code_challenge_method: 'S256', scope }).toString()}`;
  if (!valid) return <main className="center-page"><section className="consent-card"><span className="brand-mark">tokpop.dev</span><h1>Invalid connection request</h1><p>The client, callback, or PKCE challenge could not be verified.</p></section></main>;
  if (!user) return <main className="center-page"><section className="consent-card"><span className="brand-mark">tokpop.dev</span><p className="eyebrow">tokpop.dev</p><h1>Connect your profile</h1><p>Sign in with GitHub to approve this assistant connection.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with GitHub</a></section></main>;
  return <main className="center-page"><section className="consent-card">
    <span className="brand-mark">tokpop.dev</span>
    <p className="eyebrow">MCP connection</p>
    <h1>Allow your assistant to use this profile?</h1>
    <p className="consent-direction">You are authorizing the connected assistant to call tokpop.dev tools on your behalf. This does not give tokpop.dev access to your assistant account.</p>
    <div className="consent-flow" aria-label="Connection direction"><strong>Your assistant</strong><span aria-hidden="true">→</span><strong>tokpop.dev tools</strong></div>
    <div className="consent-permissions">
      <div><strong>Read profile</strong><span>See your profile summary and sharing links.</span></div>
      <div><strong>Record on request</strong><span>Add one observed event only when a recording tool is invoked.</span></div>
      <div><strong>Publish on request</strong><span>Create a reviewed session story only when you explicitly ask.</span></div>
    </div>
    <p className="consent-boundary"><strong>Not included:</strong> chat history, provider credentials, or background collection.</p>
    <ConsentActions clientId={clientId} redirectUri={redirectUri} state={state} codeChallenge={codeChallenge} scope={scope}/>
  </section></main>;
}
