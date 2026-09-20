import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { ConnectForm } from './connect-form';
import { GitHubProofSync } from './github-proof-sync';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string; onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '', onboarding } = await searchParams;
  const isOnboarding = onboarding === '1';
  const starterProfileReady = isOnboarding && Boolean(user);

  return <main className="marketing-page connect-page">
    <SiteHeader user={user}/>
    <section className="narrow-hero connect-hero">
      <p className="eyebrow">{starterProfileReady ? 'Onboarding · your starter profile is ready' : isOnboarding ? 'Onboarding · start with GitHub' : 'Choose the evidence source'}</p>
      <h1>{starterProfileReady ? 'Publish now. Add stronger proof when you want.' : isOnboarding ? 'Create your profile without installing anything.' : 'Web conversations in the browser. Coding activity from your computer.'}</h1>
      <p>{starterProfileReady ? 'GitHub already created your private starter profile. Preview and publish it now with no installation, or add one of the optional evidence sources below first.' : isOnboarding ? 'Sign in with GitHub to create a private starter profile. Additional browser and local coding sources are optional upgrades.' : 'ChatGPT and Claude Web have browser-based options. Coding tools store their evidence locally, so they use a small privacy-filtering collector.'}</p>
      {isOnboarding && !user ? <Link className="primary-link dashboard-signin" href={`/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>Make my card →</Link> : null}
    </section>

    {isOnboarding && user ? <>
      <section className="onboarding-progress" aria-label="Onboarding progress"><div className="complete"><span>01</span><strong>GitHub identity</strong><small>Complete</small></div><div className="active"><span>02</span><strong>Starter profile</strong><small>Ready</small></div><div><span>03</span><strong>Publish and share</strong><small>Next</small></div></section>
      <GitHubProofSync username={user.login}/>
      <section className="onboarding-publish-now">
        <div><p className="eyebrow">30-second path · no install</p><h2>Your private profile is ready to preview.</h2><p>Publish a GitHub-verified starter profile now. Local coding evidence can be connected later without recreating your profile.</p></div>
        <div><Link className="primary-link" href="/share?onboarding=1">Preview and publish →</Link><a className="text-link" href="#add-sources">Add a source first ↓</a></div>
      </section>
    </> : null}

    <section className="web-connect-section" id="add-sources">
      <div className="section-intro">
        <div><p className="eyebrow">Optional upgrades · browser only</p><h2>ChatGPT and Claude Web</h2></div>
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
        <div><p className="eyebrow">Optional upgrade · strongest coding proof</p><h2>Codex, Claude Code, Cursor, Gemini CLI, and Copilot CLI</h2></div>
        <p>The collector is not required to create a profile. Use it when you want verified local coding activity: it removes sensitive fields, previews the exact aggregate payload, and pairs this device.</p>
      </div>
      <div className="connect-grid">
        <article className="command-card"><span>01 · RUN ON YOUR COMPUTER</span><code>npx ai-native-profile@latest connect</code><p>Nothing is uploaded before you review the privacy boundary and approve this device.</p></article>
        <article className="approval-card"><span>02 · APPROVE HERE</span>{user ? <ConnectForm initialCode={code}/> : <><h2>GitHub identity required</h2><p>Pairing attaches the device to a verified account.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article>
      </div>
    </section>

    <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, coverage, and provenance.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, tokens, and environment variables.</p></div></section>
    {isOnboarding && user ? <section className="onboarding-finish"><div><p className="eyebrow">Ready when you are</p><h2>Preview, publish, and copy your card.</h2><p>Adding evidence is always optional. Your profile remains private until you confirm.</p></div><Link className="primary-link" href="/share?onboarding=1">Continue to my profile →</Link></section> : null}
  </main>;
}
