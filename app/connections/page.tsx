import { env } from 'cloudflare:workers';
import Link from 'next/link';
import { currentGitHubUser } from '../../lib/auth';
import { ensureDb } from '../../db/ensure';
import { SiteHeader } from '../ui/site-header';

export const dynamic = 'force-dynamic';

type CoverageRow = {
  source: string;
  coverage_start: string;
  coverage_end: string;
  last_synced_at: string;
  completeness: string;
  competitive_eligible: number;
  note: string | null;
  provenance: string | null;
};

const sourceDefinitions = [
  { id: 'github', mark: 'GH', name: 'GitHub', group: 'Identity and delivery', method: 'GitHub OAuth', description: 'Verified identity plus public commits, pull requests, reviews, and releases.', href: '/settings/github', action: 'Manage GitHub' },
  { id: 'codex', mark: 'CX', name: 'Codex', group: 'Coding activity', method: 'Local App Server + connector', description: 'Official account totals when available, with local session detail used as supporting evidence.', href: '/connect', action: 'Pair connector' },
  { id: 'claude_code', mark: 'CL', name: 'Claude Code', group: 'Coding activity', method: 'Local connector', description: 'Reads the official local statistics cache and retained session logs after approval.', href: '/connect', action: 'Pair connector' },
  { id: 'cursor', mark: 'CU', name: 'Cursor', group: 'Coding activity', method: 'Local connector', description: 'Reads supported local database metadata. Derived values are labelled and estimated values are not ranked.', href: '/connect', action: 'Pair connector' },
  { id: 'gemini_cli', mark: 'GE', name: 'Gemini CLI', group: 'Coding activity', method: 'Local connector', description: 'Collects aggregate CLI telemetry with prompt logging disabled.', href: '/connect', action: 'Pair connector' },
  { id: 'copilot_cli', mark: 'CP', name: 'GitHub Copilot CLI', group: 'Coding activity', method: 'Local connector', description: 'Collects supported CLI activity only; personal IDE autocomplete is not claimed.', href: '/connect', action: 'Pair connector' },
  { id: 'chatgpt_web', mark: 'CG', name: 'ChatGPT Web', group: 'Conversation activity', method: 'MCP observation or official export', description: 'Records explicit tool calls or approved export aggregates—not silent conversation history.', href: '/integrations/mcp', action: 'Connection options' },
  { id: 'claude_web', mark: 'CW', name: 'Claude Web', group: 'Conversation activity', method: 'MCP observation or official export', description: 'Records explicit tool calls or approved export aggregates and never affects rankings.', href: '/integrations/mcp', action: 'Connection options' },
] as const;

const provenanceLabels: Record<string, string> = {
  official_account_api: 'Official account source',
  official_export: 'Official export',
  local_exact: 'Local exact',
  local_derived: 'Locally derived',
  mcp_observed: 'MCP observed',
  estimated: 'Estimated',
};

function relativeSync(value: string): string {
  const age = Date.now() - Date.parse(value);
  if (!Number.isFinite(age)) return 'Unknown sync time';
  if (age < 60_000) return 'Synced just now';
  if (age < 3_600_000) return `Synced ${Math.floor(age / 60_000)}m ago`;
  if (age < 86_400_000) return `Synced ${Math.floor(age / 3_600_000)}h ago`;
  return `Synced ${Math.floor(age / 86_400_000)}d ago`;
}

export default async function ConnectionsPage() {
  const user = await currentGitHubUser();
  if (!user) return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Connections</p><h1>Connect every source after GitHub sign-in.</h1><p>GitHub verifies your identity. Inside your private dashboard, add Codex, Claude Code, Cursor, ChatGPT Web, Claude Web, and the rest individually.</p><Link className="primary-link dashboard-signin" href="/api/auth/github/start?return_to=/connections">Continue with GitHub</Link></section></main>;

  await ensureDb();
  const [coverageResult, deviceResult] = await Promise.all([
    env.DB.prepare(`SELECT sc.source,sc.coverage_start,sc.coverage_end,sc.last_synced_at,sc.completeness,sc.competitive_eligible,sc.note,
      (SELECT dm.provenance FROM daily_metrics dm WHERE dm.user_id=sc.user_id AND dm.source=sc.source ORDER BY dm.date DESC LIMIT 1) AS provenance
      FROM source_coverage sc WHERE sc.user_id=? ORDER BY sc.source`).bind(user.userId).all<CoverageRow>(),
    env.DB.prepare(`SELECT count(*) AS count FROM devices WHERE user_id=? AND status='approved'`).bind(user.userId).first<{ count: number }>(),
  ]);
  const coverage = new Map((coverageResult.results ?? []).map((row) => [row.source, row]));
  const connectedCount = sourceDefinitions.filter((source) => source.id === 'github' || coverage.has(source.id)).length;

  return <main className="marketing-page connections-page">
    <SiteHeader user={user}/>
    <section className="connections-hero">
      <div><p className="eyebrow">Sources · @{user.login}</p><h1>Connections</h1><p>Every source names what it can prove, how it was collected, and when it was last seen.</p></div>
      <div className="connection-summary"><strong>{connectedCount}<small>/{sourceDefinitions.length}</small></strong><span>sources with evidence</span><p>{deviceResult?.count ?? 0} approved local {(deviceResult?.count ?? 0) === 1 ? 'device' : 'devices'}</p></div>
    </section>
    <section className="connection-groups">
      {['Identity and delivery', 'Coding activity', 'Conversation activity'].map((group) => <div className="connection-group" key={group}>
        <div className="group-heading"><h2>{group}</h2><p>{group === 'Conversation activity' ? 'Optional and excluded from competitive scores.' : group === 'Coding activity' ? 'Collected locally after device approval.' : 'Your primary account and delivery evidence.'}</p></div>
        <div className="connection-cards">
          {sourceDefinitions.filter((source) => source.group === group).map((source) => {
            const record = coverage.get(source.id);
            const stale = record ? Date.now() - Date.parse(record.last_synced_at) > 3 * 86_400_000 : false;
            const state = source.id === 'github' && !record ? 'Identity connected' : !record ? 'Not connected' : stale ? 'Stale' : record.completeness === 'full' ? 'Connected' : 'Partial';
            const stateClass = state === 'Connected' || state === 'Identity connected' ? 'connected' : state === 'Not connected' ? 'disconnected' : 'partial';
            return <article className="connection-card" key={source.id}>
              <div className="connection-source"><span className="connection-mark">{source.mark}</span><div><h3>{source.name}</h3><p>{source.method}</p></div></div>
              <p className="connection-description">{source.description}</p>
              <div className="connection-meta">
                <span><b>Provenance</b>{source.id === 'github' && !record ? 'GitHub verified identity' : record?.provenance ? provenanceLabels[record.provenance] ?? record.provenance : 'No evidence received'}</span>
                <span><b>Coverage</b>{record ? `${record.coverage_start} → ${record.coverage_end}` : 'Starts after first sync'}</span>
                <span><b>Freshness</b>{record ? relativeSync(record.last_synced_at) : source.id === 'github' ? 'Signed in now' : 'Never synced'}</span>
              </div>
              <div className="connection-controls"><span className={`connection-state ${stateClass}`}><i/>{state}</span><Link className="connection-action" href={source.href}>{record ? 'Manage' : source.action} →</Link></div>
            </article>;
          })}
        </div>
      </div>)}
    </section>
    <section className="connection-disclaimer"><strong>No invisible account access.</strong><p>“Connected” always names the evidence path. Local coding tools use the approved connector; ChatGPT and Claude Web use explicit MCP events or locally parsed official exports.</p><Link href="/methodology">Read the methodology →</Link></section>
  </main>;
}
