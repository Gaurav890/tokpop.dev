import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { ConnectForm } from './connect-form';
import { GitHubProofSync } from './github-proof-sync';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '', onboarding } = await searchParams;
  const isOnboarding = onboarding === '1';

  return <main className="marketing-page connect-page">
    <SiteHeader user={user}/>
    <section className="narrow-hero connect-hero">
      <p className="eyebrow">{isOnboarding ? 'Onboarding · step 2 of 3' : 'Choose the evidence source'}</p>
      <h1>{isOnboarding && user ? 'Your GitHub proof is connected. Add AI activity now.' : 'Web conversations in the browser. Coding activity from your computer.'}</h1>
      <p>{isOnboarding ? 'Your profile starts with GitHub delivery evidence. Choose a browser option or the optional local collector to add an AI activity source before reviewing your dashboard.' : 'ChatGPT and Claude Web have browser-based options. Coding tools store their evidence locally, so they use a small privacy-filtering collector.'}</p>
    </section>

    {isOnboarding && user ? <>
      <section className="onboarding-progress" aria-label="Onboarding progress"><div className="complete"><span>01</span><strong>GitHub identity</strong><small>Complete</small></div><div className="active"><span>02</span><strong>Add AI activity</strong><small>Choose below</small></div><div><span>03</span><strong>Review profile</strong><small>Next</small></div></section>
      <GitHubProofSync username={user.login}/>
    </> : null}

    <section className="web-connect-section">
      <div className="section-intro">
        <div><p className="eyebrow">Browser options · no install</p><h2>ChatGPT and Claude Web</h2></div>
        <p>A browser sign-in alone cannot give another service your complete history. Choose a local export for past activity or MCP for explicit future activity.</p>
      </div>
      <div className="web-connect-grid">
        <article className="web-connect-card">
          <div className="web-source-head"><span className="source-mark lime">CG</span><div><h3>ChatGPT Web</h3><p>Conversation activity · never ranked</p></div></div>
          <p>Import an official export ZIP locally in this browser, or add the hosted MCP endpoint to record only tool calls you approve.</p>
          <div className="connection-choice-list">
            <div><strong>Past history</strong><span>Official export · aggregate counts only</span><Link className="primary-link compact-link" href={`/import?source=chatgpt${isOnboarding ? '&onboarding=1' : ''}`}>Import ChatGPT history</Link></div>
            <div><strong>Future activity</strong><span>MCP observed · explicit calls only</span><Link className="secondary-link compact-link" href={`/integrations/mcp${isOnboarding ? '?onboarding=1' : ''}#chatgpt`}>Set up MCP</Link></div>
          </div>
        </article>
        <article className="web-connect-card">
          <div className="web-source-head"><span className="source-mark orange">CL</span><div><h3>Claude Web</h3><p>Conversation activity · never ranked</p></div></div>
          <p>Import an official export ZIP locally in this browser, or add the remote MCP integration to record only tool calls you approve.</p>
          <div className="connection-choice-list">
            <div><strong>Past history</strong><span>Official export · aggregate counts only</span><Link className="primary-link compact-link" href={`/import?source=claude${isOnboarding ? '&onboarding=1' : ''}`}>Import Claude history</Link></div>
            <div><strong>Future activity</strong><span>MCP observed · explicit calls only</span><Link className="secondary-link compact-link" href={`/integrations/mcp${isOnboarding ? '?onboarding=1' : ''}#claude`}>Set up MCP</Link></div>
          </div>
        </article>
      </div>
    </section>

    <section className="local-connector-section">
      <div className="section-intro">
        <div><p className="eyebrow">Optional · strongest coding proof</p><h2>Codex, Claude Code, Cursor, Gemini CLI, and Copilot CLI</h2></div>
        <p>The collector is not required to create a profile. Use it when you want verified local coding activity: it removes sensitive fields, previews the exact aggregate payload, and pairs this device.</p>
      </div>
      <div className="connect-grid">
        <article className="command-card"><span>01 · RUN ON YOUR COMPUTER</span><code>npx ai-native-profile connect</code><p>Nothing is uploaded before you review the privacy boundary and approve this device.</p></article>
        <article className="approval-card"><span>02 · APPROVE HERE</span>{user ? <ConnectForm initialCode={code}/> : <><h2>GitHub identity required</h2><p>Pairing attaches the device to a verified account.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article>
      </div>
    </section>

    <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, coverage, and provenance.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, tokens, and environment variables.</p></div></section>
    {isOnboarding && user ? <section className="onboarding-finish"><div><p className="eyebrow">Step 3</p><h2>Review the proof you have connected.</h2><p>You can return here to strengthen the profile with additional sources at any time.</p></div><Link className="primary-link" href="/dashboard">Open my dashboard →</Link></section> : null}
  </main>;
}
