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
      <h1>Use your card from chat.</h1>
      <p>Ask your assistant to read your profile, create card links, or record a session. This connection does not import your chat history or track usage in the background.</p>
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
      <p>Each recorded event comes from a tool call. To add earlier conversation activity, import an official export. Your browser turns it into daily counts before upload.</p>
      <Link className="secondary-link compact-link" href="/import">Import an export</Link>
    </section>
    {isOnboarding ? <section className="onboarding-mcp-return"><div><strong>After adding the connector</strong><p>Invoke <code>record_session</code> once, then return to preview and publish your profile.</p></div><Link className="primary-link compact-link" href="/share?onboarding=1">Preview and publish →</Link></section> : null}
    <section className="tool-list"><p className="eyebrow">Available tools</p>{[['get_profile','Read profile summary and sharing URLs.'],['record_session','Record one session event from a tool call you request.'],['publish_session','Publish a reviewed summary, unlisted by default.'],['create_share_card','Create README card and public profile URLs.']].map(([name, detail]) => <div key={name}><code>{name}</code><p>{detail}</p></div>)}</section>
    <section className="plain-section"><h2>What authorization means</h2><p>Sign in to tokpop.dev with GitHub to authorize the connector. Your ChatGPT or Claude credentials stay with that provider. Publishing a summary requires a tool call and a secret scan. Conversation activity never affects your rank.</p><Link className="secondary-link" href="/connect">Connect coding tools →</Link></section>
  </main>;
}
