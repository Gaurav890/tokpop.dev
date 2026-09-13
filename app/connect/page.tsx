import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { SiteHeader } from '../ui/site-header';
import { ConnectForm } from './connect-form';

export default async function ConnectPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await currentGitHubUser();
  const { code = '' } = await searchParams;

  return <main className="marketing-page connect-page">
    <SiteHeader user={user}/>
    <section className="narrow-hero connect-hero">
      <p className="eyebrow">Choose the evidence source</p>
      <h1>Web conversations in the browser. Coding activity from your computer.</h1>
      <p>ChatGPT and Claude Web have browser-based options. Coding tools store their evidence locally, so they use a small privacy-filtering collector.</p>
    </section>

    <section className="web-connect-section">
      <div className="section-intro">
        <div><p className="eyebrow">No install required</p><h2>ChatGPT and Claude Web</h2></div>
        <p>A browser sign-in alone cannot give another service your complete history. Choose a local export for past activity or MCP for explicit future activity.</p>
      </div>
      <div className="web-connect-grid">
        <article className="web-connect-card">
          <div className="web-source-head"><span className="source-mark lime">CG</span><div><h3>ChatGPT Web</h3><p>Conversation activity · never ranked</p></div></div>
          <p>Import an official export ZIP locally in this browser, or add the hosted MCP endpoint to record only tool calls you approve.</p>
          <div className="connection-choice-list">
            <div><strong>Past history</strong><span>Official export · aggregate counts only</span><Link className="primary-link compact-link" href="/import?source=chatgpt">Import ChatGPT history</Link></div>
            <div><strong>Future activity</strong><span>MCP observed · explicit calls only</span><Link className="secondary-link compact-link" href="/integrations/mcp#chatgpt">Set up MCP</Link></div>
          </div>
        </article>
        <article className="web-connect-card">
          <div className="web-source-head"><span className="source-mark orange">CL</span><div><h3>Claude Web</h3><p>Conversation activity · never ranked</p></div></div>
          <p>Import an official export ZIP locally in this browser, or add the remote MCP integration to record only tool calls you approve.</p>
          <div className="connection-choice-list">
            <div><strong>Past history</strong><span>Official export · aggregate counts only</span><Link className="primary-link compact-link" href="/import?source=claude">Import Claude history</Link></div>
            <div><strong>Future activity</strong><span>MCP observed · explicit calls only</span><Link className="secondary-link compact-link" href="/integrations/mcp#claude">Set up MCP</Link></div>
          </div>
        </article>
      </div>
    </section>

    <section className="local-connector-section">
      <div className="section-intro">
        <div><p className="eyebrow">Local collector</p><h2>Codex, Claude Code, Cursor, Gemini CLI, and Copilot CLI</h2></div>
        <p>The collector discovers supported tools, removes sensitive fields, shows the exact aggregate payload, and pairs the device to this cloud dashboard.</p>
      </div>
      <div className="connect-grid">
        <article className="command-card"><span>01 · RUN ON YOUR COMPUTER</span><code>npx ai-native-profile connect</code><p>Nothing is uploaded before you review the privacy boundary and approve this device.</p></article>
        <article className="approval-card"><span>02 · APPROVE HERE</span>{user ? <ConnectForm initialCode={code}/> : <><h2>GitHub identity required</h2><p>Pairing attaches the device to a verified account.</p><a className="primary-link" href={`/api/auth/github/start?return_to=${encodeURIComponent(`/connect?code=${code}`)}`}>Continue with GitHub</a></>}</article>
      </div>
    </section>

    <section className="field-boundary"><div><p className="eyebrow">May sync</p><h2>Aggregates only</h2><p>Dates, provider/model IDs, counts, duration, collector versions, anonymous device ID, coverage, and provenance.</p></div><div className="never"><p className="eyebrow">Never syncs</p><h2>Content or credentials</h2><p>Prompts, responses, source code, arguments, outputs, commands, repositories, paths, titles, emails, cookies, tokens, and environment variables.</p></div></section>
  </main>;
}
