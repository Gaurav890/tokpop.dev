import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { ConnectForm } from './connect-form';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '' } = await searchParams;
  return <main className="marketing-page"><SiteHeader user={user}/><section className="narrow-hero"><p className="eyebrow">Private local connector</p><h1>Connect local coding activity to your cloud profile.</h1><p>The connector discovers supported tools, strips sensitive content, previews the exact aggregate fields, and syncs signed batches. There is no local analytics dashboard.</p></section>
  <section className="connect-grid"><article className="command-card"><span>01 · RUN ON YOUR COMPUTER</span><code>npx ai-native-profile connect</code><p>Nothing is uploaded before you review the privacy boundary and approve this device.</p></article><article className="approval-card"><span>02 · APPROVE HERE</span>{user ? <ConnectForm initialCode={code}/> : <><h2>GitHub identity required</h2><p>Pairing attaches the device to a verified account.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article></section>
  <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, coverage, and provenance.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, tokens, and environment variables.</p></div></section></main>;
}
