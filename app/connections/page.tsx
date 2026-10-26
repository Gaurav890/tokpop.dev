import { runtimeEnv as env } from '@/lib/runtime-env';
import Link from '../ui/native-link';
import { currentGitHubUser } from '../../lib/auth';
import { ensureDb } from '../../db/ensure';
import { SiteHeader } from '../ui/site-header';
import { SiteFooter } from '../ui/site-footer';
import { backendJson, backendOrigin } from '../../lib/server-api';
import { RemoveImport } from './remove-import';

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
  { id: 'github', mark: 'GH', name: 'GitHub', group: 'Identity and delivery', method: 'GitHub OAuth', description: 'Verified identity plus exact 90-day contribution totals for commits, pull requests, and reviews.', href: '/settings/github', action: 'Manage GitHub' },
  { id: 'codex', mark: 'CX', name: 'Codex', group: 'Coding activity', method: 'Local App Server + connector', description: 'Uses account totals when available, or retained local token records when account usage is unavailable.', href: '/connect', action: 'Pair connector' },
  { id: 'claude_code', mark: 'CL', name: 'Claude Code', group: 'Coding activity', method: 'Local connector', description: 'Reads the official local statistics cache and retained session logs after approval.', href: '/connect', action: 'Pair connector' },
  { id: 'cursor', mark: 'CU', name: 'Cursor', group: 'Coding activity', method: 'Local connector', description: 'Reads supported local database metadata. Derived values are labelled and estimated values are not ranked.', href: '/connect', action: 'Pair connector' },
  { id: 'gemini_cli', mark: 'GE', name: 'Gemini CLI', group: 'Coding activity', method: 'Local connector', description: 'Collects aggregate CLI telemetry with prompt logging disabled.', href: '/connect', action: 'Pair connector' },
  { id: 'copilot_cli', mark: 'CP', name: 'GitHub Copilot CLI', group: 'Coding activity', method: 'Local connector', description: 'Collects supported CLI activity only; personal IDE autocomplete is not claimed.', href: '/connect', action: 'Pair connector' },
] as const;

const experimentalSources = [
  { id: 'chatgpt_web', mark: 'CG', name: 'ChatGPT Web', description: 'Import aggregate counts from an official export, or record only explicit MCP tool calls.' },
  { id: 'claude_web', mark: 'CW', name: 'Claude Web', description: 'Import aggregate counts from an official export, or record only explicit MCP tool calls.' },
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
  if (!Number.isFinite(age) || age < -300_000) return 'Unknown sync time';
  if (age < 60_000) return 'Synced just now';
  if (age < 3_600_000) return `Synced ${Math.floor(age / 60_000)}m ago`;
  if (age < 86_400_000) return `Synced ${Math.floor(age / 3_600_000)}h ago`;
  return `Synced ${Math.floor(age / 86_400_000)}d ago`;
}

export default async function ConnectionsPage() {
  const user = await currentGitHubUser();
  if (!user) return <main className="marketing-page"><SiteHeader/><section className="narrow-hero"><p className="eyebrow">Start with your card</p><h1>Start your private builder card.</h1><p>Sign in with GitHub, then run one command on your coding computer to add activity from supported tools.</p><Link className="primary-link dashboard-signin" href={`/api/auth/github/start?return_to=${encodeURIComponent('/share?onboarding=1')}`}>Make my card</Link></section></main>;

  let coverageRows: CoverageRow[];
  let approvedDevices: number;
  if (backendOrigin()) {
    const data = await backendJson<{ coverage: CoverageRow[]; approvedDevices: number }>('/api/v1/connections', { authenticated: true });
    coverageRows = data.coverage;
    approvedDevices = data.approvedDevices;
  } else {
    await ensureDb();
    const [coverageResult, deviceResult] = await Promise.all([
      env.DB.prepare(`SELECT sc.source,sc.coverage_start,sc.coverage_end,sc.last_synced_at,sc.completeness,sc.competitive_eligible,sc.note,
        (SELECT dm.provenance FROM daily_metrics dm WHERE dm.user_id=sc.user_id AND dm.source=sc.source ORDER BY dm.date DESC LIMIT 1) AS provenance
        FROM source_coverage sc WHERE sc.user_id=? ORDER BY sc.source`).bind(user.userId).all<CoverageRow>(),
      env.DB.prepare(`SELECT count(*) AS count FROM devices WHERE user_id=? AND status='approved'`).bind(user.userId).first<{ count: number }>(),
    ]);
    coverageRows = coverageResult.results ?? [];
    approvedDevices = deviceResult?.count ?? 0;
  }
  const coverage = new Map(coverageRows.map((row) => [row.source, row]));
  const connectedCount = sourceDefinitions.filter((source) => source.id === 'github' || coverage.has(source.id)).length;

  return <main className="marketing-page connections-page">
    <SiteHeader user={user}/>
    <section className="connections-hero">
      <div><p className="eyebrow">Sources · @{user.login}</p><h1>Connections</h1><p>See which tools have synced, how their stats were collected, and how much history is available.</p></div>
      <div className="connection-summary"><strong>{connectedCount}<small>/{sourceDefinitions.length}</small></strong><span>sources with evidence</span><p>{approvedDevices} approved local {approvedDevices === 1 ? 'device' : 'devices'}</p></div>
    </section>
    <section className="connect-return-card"><div><p className="eyebrow">One setup · all supported tools</p><h2>Add a tool or another computer.</h2><p>Use the computer where you run your coding tools. The setup command checks them together; no separate provider connection is needed.</p></div><Link className="primary-link" href="/connect">Connect my tools →</Link></section>
    <section className="connection-groups">
      {['Identity and delivery', 'Coding activity'].map((group) => <div className="connection-group" key={group}>
        <div className="group-heading"><h2>{group}</h2><p>{group === 'Coding activity' ? 'Collected locally after device approval.' : 'Your GitHub identity and contribution counts.'}</p></div>
        <div className="connection-cards">
          {sourceDefinitions.filter((source) => source.group === group).map((source) => {
            const record = coverage.get(source.id);
            const syncAge = record ? Date.now() - Date.parse(record.last_synced_at) : NaN;
            const unknownSync = record && (!Number.isFinite(syncAge) || syncAge < -300_000);
            const stale = record && syncAge > 3 * 86_400_000;
            const state = source.id === 'github' && !record ? 'Identity connected' : !record ? 'Not connected' : unknownSync ? 'Check sync' : stale ? 'Sync delayed' : 'Connected';
            const stateClass = state === 'Connected' || state === 'Identity connected' ? 'connected' : state === 'Not connected' ? 'disconnected' : 'partial';
            const localHistory = record && (record.provenance?.startsWith('local_') || record.provenance === 'estimated' || (!record.provenance && source.id !== 'github'));
            const historyNote = !record || record.completeness === 'full' ? null
              : record.completeness !== 'partial' ? 'History coverage is not verified yet. A successful sync does not guarantee complete history.'
              : localHistory ? 'Local history only; older or other-device activity may be missing. This does not mean the connection failed.'
              : 'History coverage is limited; some activity may be missing. This does not mean the connection failed.';
            return <article className="connection-card" key={source.id}>
              <div className="connection-source"><span className="connection-mark">{source.mark}</span><div><h3>{source.name}</h3><p>{source.method}</p></div></div>
              <p className="connection-description">{source.description}</p>
              <div className="connection-meta">
                <span><b>Provenance</b>{source.id === 'github' && !record ? 'GitHub verified identity' : record?.provenance ? provenanceLabels[record.provenance] ?? record.provenance : 'No evidence received'}</span>
                <span><b>Coverage</b>{record ? `${record.coverage_start} → ${record.coverage_end}` : 'Starts after first sync'}</span>
              </div>
              <div className="connection-controls"><div className="connection-health"><span className={`connection-state ${stateClass}`}><i/>{state}</span><small>{record ? relativeSync(record.last_synced_at) : source.id === 'github' ? 'Signed in now' : 'Never synced'}</small></div><Link className="connection-action" href={source.href}>{source.id === 'github' ? 'Manage GitHub' : record ? stale || unknownSync ? 'Check setup' : 'Add another computer' : `Connect ${source.name}`} →</Link></div>
              {record && <div className="connection-history-note">
                {historyNote && <p>{historyNote}</p>}
                {(stale || unknownSync) && <p>{stale ? 'No recent sync. Updates can pause while your computer is asleep or offline.' : 'We could not verify the last sync time. Check your connector setup.'}</p>}
                {record.note && <details><summary>Collection details</summary><p>{record.note}</p></details>}
              </div>}
            </article>;
          })}
        </div>
      </div>)}
    </section>
    <details className="experimental-sources">
      <summary><span><strong>Experimental conversation sources</strong><small>Optional · partial coverage · never ranked</small></span><b>Show</b></summary>
      <div className="experimental-source-grid">{experimentalSources.map((source) => {
        const record = coverage.get(source.id);
        return <article key={source.id}><span className="connection-mark">{source.mark}</span><div><h3>{source.name}</h3><p>{source.description}</p><small>{record ? `${provenanceLabels[record.provenance ?? ''] ?? 'Partial'} · ${relativeSync(record.last_synced_at)}` : 'No activity connected'}</small></div><div><Link href={`/import?source=${source.id === 'chatgpt_web' ? 'chatgpt' : 'claude'}`}>Import export</Link><Link href="/integrations/mcp">MCP setup</Link></div><RemoveImport source={source.id} name={source.name}/></article>;
      })}</div>
      <p>These sources do not provide silent or complete account history. They appear publicly only after data exists and you enable the conversation section.</p>
    </details>
    <section className="connection-disclaimer"><strong>You choose what to connect.</strong><p>Coding stats come from the collector you approve. Web conversation activity comes from tool calls you request or exports processed in your browser.</p><Link href="/settings/privacy">Privacy controls →</Link></section>
    <SiteFooter/>
  </main>;
}
