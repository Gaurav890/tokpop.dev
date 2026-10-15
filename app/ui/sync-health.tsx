import type { PublicProfile } from '../../lib/demo-profile';
import { sourceSyncSummary, syncFreshness, utcTimestamp } from '../../lib/data-freshness';
import Link from './native-link';

export function SyncHealth({ profile, owner = false, compact = false }: { profile: PublicProfile; owner?: boolean; compact?: boolean }) {
  const sources = profile.coverage.filter((row) => !['github', 'chatgpt_web', 'claude_web'].includes(row.source));
  const summary = sourceSyncSummary(sources);
  if (!profile.verified) return <p className="fine-print">Illustrative example data, not a live account.</p>;
  if (compact) return <p className="sync-health-inline"><span>{summary}.</span> <Link href="/connections">Manage connections →</Link></p>;
  return <section className="public-card wide sync-health" aria-label="Source sync health">
    <p className="eyebrow">{summary}</p>
    <p>Sync time and activity time are different. A successful upload can contain older activity. Devices must be awake and online for background updates.</p>
    <dl className="delivery-list">{sources.map((row) => <div key={row.source}><dt>{row.label}<small> · {syncFreshness(row.lastSyncedAt) === 'recent' ? 'Recent sync' : syncFreshness(row.lastSyncedAt) === 'unknown' ? 'Sync time unavailable' : 'No recent sync'}</small></dt><dd><time dateTime={row.lastSyncedAt}>{utcTimestamp(row.lastSyncedAt)}</time></dd></div>)}</dl>
    {owner ? <p className="fine-print">Run <code>anp doctor</code> to check the scheduled job; <code>anp sync</code> to retry. <Link href="/connections">Manage your connector →</Link></p> : null}
  </section>;
}
