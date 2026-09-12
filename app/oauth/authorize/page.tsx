import { currentGitHubUser } from '../../../lib/auth';
import { verifyClient } from '../../../lib/oauth';

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
  if (!valid) return <main className="center-page"><section className="consent-card"><span className="brand-mark">A/</span><h1>Invalid connection request</h1><p>The client, callback, or PKCE challenge could not be verified.</p></section></main>;
  if (!user) return <main className="center-page"><section className="consent-card"><span className="brand-mark">A/</span><p className="eyebrow">AI Native Profile</p><h1>Connect your profile</h1><p>Sign in with GitHub to approve this ChatGPT or Claude connection.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(returnTo)}`}>Continue with GitHub</a></section></main>;
  return <main className="center-page"><section className="consent-card"><span className="brand-mark">A/</span><p className="eyebrow">MCP connection</p><h1>Allow access to your profile?</h1><p>This connection can read your public profile, record a provider-observed activity event, and publish a session story only when you explicitly invoke the corresponding tool.</p><ul><li>No chat history access</li><li>No provider credentials</li><li>No background conversation collection</li></ul><form method="post" action="/oauth/authorize/decision"><input type="hidden" name="client_id" value={clientId}/><input type="hidden" name="redirect_uri" value={redirectUri}/><input type="hidden" name="state" value={state}/><input type="hidden" name="code_challenge" value={codeChallenge}/><input type="hidden" name="scope" value={scope}/><button className="primary-button" name="decision" value="approve">Allow connection</button><button className="text-button" name="decision" value="deny">Cancel</button></form></section></main>;
}
