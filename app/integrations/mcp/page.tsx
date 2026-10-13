import Link from '../../ui/native-link';
import { currentGitHubUser } from '../../../lib/auth';
import { SiteHeader } from '../../ui/site-header';
import { CopyEndpoint } from './copy-endpoint';

const origin = (process.env.PUBLIC_APP_URL ?? 'https://ai-native-profile.vercel.app').replace(/\/$/, '');

export default async function McpPage({ searchParams }: { searchParams: Promise<{ onboarding?: string }> }) {
  const user = await currentGitHubUser();
  const { onboarding } = await searchParams;
  const isOnboarding = onboarding === '1';
  const chatgptEndpoint = `${origin}/mcp/chatgpt`;
  const claudeEndpoint = `${origin}/mcp/claude`;

  return <main className="marketing-page mcp-page">
    <SiteHeader user={user}/>
    <section className="narrow-hero">
      <p className="eyebrow">{isOnboarding ? 'Power-up · add a conversation source' : 'MCP · only when you say so'}</p>
      <h1>Connect the moments you choose.</h1>
      <p>MCP lets an assistant call profile tools when you ask. It never unlocks your provider account, old conversations, or background activity.</p>
    </section>
    <section className="integration-grid">
      <article id="chatgpt">
        <span className="source-mark lime">CG</span>
        <h2>ChatGPT</h2>
        <p>In ChatGPT settings, open Apps &amp; Connectors, enable developer mode if your plan supports custom MCP, and add this endpoint.</p>
        <code className="endpoint-code">{chatgptEndpoint}</code>
        <div className="integration-actions"><CopyEndpoint value={chatgptEndpoint}/><a className="primary-link compact-link" href="https://chatgpt.com/" target="_blank" rel="noreferrer">Open ChatGPT ↗</a></div>
        <small>Custom MCP availability depends on the ChatGPT plan and workspace policy.</small>
      </article>
      <article id="claude">
        <span className="source-mark orange">CL</span>
        <h2>Claude</h2>
        <p>Open Claude Settings → Connectors, choose Add custom connector, and paste this endpoint.</p>
        <code className="endpoint-code">{claudeEndpoint}</code>
        <div className="integration-actions"><CopyEndpoint value={claudeEndpoint}/><a className="primary-link compact-link" href="https://claude.ai/settings/connectors" target="_blank" rel="noreferrer">Open Claude connectors ↗</a></div>
        <small>Custom connectors require a supported Claude plan and may be controlled by workspace administrators.</small>
      </article>
    </section>
    <section className="mcp-boundary">
      <strong>MCP is not history sync.</strong>
      <p>A recorded event proves that one of these tools was deliberately invoked. To add earlier activity, use an official export that is aggregated locally in your browser.</p>
      <Link className="secondary-link compact-link" href="/import">Import an export</Link>
    </section>
    {isOnboarding ? <section className="onboarding-mcp-return"><div><strong>After adding the connector</strong><p>Invoke <code>record_session</code> once, then return to preview and publish your profile.</p></div><Link className="primary-link compact-link" href="/share?onboarding=1">Preview and publish →</Link></section> : null}
    <section className="tool-list"><p className="eyebrow">Available tools</p>{[['get_profile','Read profile summary and sharing URLs.'],['record_session','Record one explicit mcp_observed session event.'],['publish_session','Publish a reviewed summary, unlisted by default.'],['create_share_card','Create README card and public profile URLs.']].map(([name, detail]) => <div key={name}><code>{name}</code><p>{detail}</p></div>)}</section>
    <section className="plain-section"><h2>What authorization means</h2><p>OAuth signs you into tokpop.dev with GitHub. Your ChatGPT or Claude credentials stay with that provider. Published summaries pass secret scanning and require an explicit tool invocation; observed conversation activity remains non-competitive.</p><Link className="secondary-link" href="/connect">See every connection option →</Link></section>
  </main>;
}
